import json
import httpx
from pathlib import Path
from datetime import date

from app.config import settings
from app.db import get_pool
from app.models.property import PropertyData
from app.models.comp import CompProperty
from app.models.report import RentEstimate

SEED_PATH = Path(__file__).parent.parent.parent / "seed" / "sample_data.json"
CACHE_TTL_DAYS = 7


def _load_seed() -> dict:
    return json.loads(SEED_PATH.read_text())


def _parse_property(raw: dict) -> PropertyData:
    return PropertyData(
        address=raw.get("formattedAddress") or raw.get("addressLine1") or raw.get("address", ""),
        city=raw.get("city"),
        state=raw.get("state"),
        zip_code=raw.get("zipCode"),
        county=raw.get("county"),
        latitude=raw.get("latitude"),
        longitude=raw.get("longitude"),
        property_type=raw.get("propertyType"),
        bedrooms=raw.get("bedrooms"),
        bathrooms=raw.get("bathrooms"),
        sqft=raw.get("squareFootage"),
        lot_size=raw.get("lotSize"),
        year_built=raw.get("yearBuilt"),
        last_sale_date=raw.get("lastSaleDate"),
        last_sale_price=raw.get("lastSalePrice") or raw.get("price"),
    )


def _parse_comp(raw: dict) -> CompProperty:
    # RentCast uses removedDate (listing close) or listedDate as the sale date
    sale_date_str = raw.get("removedDate") or raw.get("listedDate") or raw.get("saleDate")
    # Dates may be ISO datetime strings — take just the date part
    if sale_date_str and "T" in sale_date_str:
        sale_date_str = sale_date_str.split("T")[0]

    return CompProperty(
        address=raw.get("formattedAddress") or raw.get("addressLine1") or raw.get("address", ""),
        sale_price=raw.get("price") or raw.get("salePrice", 0),
        sale_date=date.fromisoformat(sale_date_str) if sale_date_str else None,
        bedrooms=raw.get("bedrooms"),
        bathrooms=raw.get("bathrooms"),
        sqft=raw.get("squareFootage"),
        lot_size=raw.get("lotSize"),
        year_built=raw.get("yearBuilt"),
        distance_miles=raw.get("distance"),
        correlation=raw.get("correlation"),
    )


async def _get_cached(endpoint: str, address: str) -> dict | None:
    """Check DB cache for a recent API response."""
    try:
        db = await get_pool()
        row = await db.fetchrow(
            """
            SELECT response FROM api_cache
            WHERE endpoint = $1 AND address = $2
              AND created_at > now() - interval '%s days'
            """ % CACHE_TTL_DAYS,
            endpoint,
            address,
        )
        if row:
            return json.loads(row["response"])
    except Exception:
        pass
    return None


async def _set_cached(endpoint: str, address: str, response: dict):
    """Store API response in DB cache (upsert)."""
    try:
        db = await get_pool()
        await db.execute(
            """
            INSERT INTO api_cache (endpoint, address, response)
            VALUES ($1, $2, $3)
            ON CONFLICT (endpoint, address)
            DO UPDATE SET response = $3, created_at = now()
            """,
            endpoint,
            address,
            json.dumps(response),
        )
    except Exception:
        pass


def _parse_value_response(data: dict) -> tuple[int, int, int, list[CompProperty], int | None, PropertyData | None]:
    comps = [_parse_comp(c) for c in data.get("comparables", [])]
    dom_values = [
        c.get("daysOnMarket")
        for c in data.get("comparables", [])
        if c.get("daysOnMarket") is not None
    ]
    avg_dom = int(sum(dom_values) / len(dom_values)) if dom_values else None
    subject = None
    if "subjectProperty" in data:
        subject = _parse_property(data["subjectProperty"])
    return (
        data.get("price", 0),
        data.get("priceRangeLow", 0),
        data.get("priceRangeHigh", 0),
        comps,
        avg_dom,
        subject,
    )


class RentCastClient:
    BASE = "https://api.rentcast.io/v1"

    def __init__(self):
        self.api_key = settings.rentcast_api_key
        self.use_seed = settings.use_seed_data

    def _headers(self) -> dict:
        return {"X-Api-Key": self.api_key, "Accept": "application/json"}

    def _find_seed_address(self, address: str) -> str | None:
        """Find a matching address key in seed data (case-insensitive partial match)."""
        seed = _load_seed()
        addr_lower = address.lower()
        for key in seed.get("properties", {}):
            if addr_lower in key.lower() or key.lower() in addr_lower:
                return key
        return None

    async def get_property(self, address: str) -> PropertyData:
        if self.use_seed:
            seed = _load_seed()
            key = self._find_seed_address(address)
            if key and key in seed["properties"]:
                return _parse_property(seed["properties"][key])
            first = next(iter(seed["properties"].values()))
            return _parse_property(first)

        # Check cache
        cached = await _get_cached("property", address)
        if cached:
            return _parse_property(cached)

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.BASE}/properties",
                params={"address": address},
                headers=self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()
            raw = data[0] if isinstance(data, list) and data else data
            await _set_cached("property", address, raw)
            return _parse_property(raw)

    async def get_value_estimate(
        self, address: str, comp_count: int = 15
    ) -> tuple[int, int, int, list[CompProperty], int | None, PropertyData | None]:
        """Returns (price, range_low, range_high, comparables, avg_days_on_market, subject_from_avm)."""
        if self.use_seed:
            seed = _load_seed()
            key = self._find_seed_address(address)
            if not key:
                key = next(iter(seed["valuations"].keys()))
            val = seed["valuations"][key]
            comps = [_parse_comp(c) for c in val.get("comparables", [])]
            dom_values = [
                c.get("daysOnMarket")
                for c in val.get("comparables", [])
                if c.get("daysOnMarket") is not None
            ]
            avg_dom = int(sum(dom_values) / len(dom_values)) if dom_values else None
            return val["price"], val["priceRangeLow"], val["priceRangeHigh"], comps, avg_dom, None

        # Check cache
        cached = await _get_cached("value", address)
        if cached:
            return _parse_value_response(cached)

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.BASE}/avm/value",
                params={"address": address, "compCount": comp_count},
                headers=self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()
            await _set_cached("value", address, data)
            return _parse_value_response(data)

    async def get_rent_estimate(self, address: str) -> RentEstimate:
        if self.use_seed:
            seed = _load_seed()
            key = self._find_seed_address(address)
            if not key:
                key = next(iter(seed["rentEstimates"].keys()))
            r = seed["rentEstimates"][key]
            return RentEstimate(
                rent=r["rent"],
                range_low=r["rentRangeLow"],
                range_high=r["rentRangeHigh"],
            )

        # Check cache
        cached = await _get_cached("rent", address)
        if cached:
            return RentEstimate(
                rent=cached.get("rent", 0),
                range_low=cached.get("rentRangeLow", 0),
                range_high=cached.get("rentRangeHigh", 0),
            )

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.BASE}/avm/rent/long-term",
                params={"address": address},
                headers=self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()
            await _set_cached("rent", address, data)
            return RentEstimate(
                rent=data.get("rent", 0),
                range_low=data.get("rentRangeLow", 0),
                range_high=data.get("rentRangeHigh", 0),
            )


rentcast = RentCastClient()
