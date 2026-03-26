import asyncio
import json
import statistics as _stats
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime

from app.db import get_pool
from app.models.property import PropertyInput, PropertyData
from app.models.report import AnalysisResponse, RentEstimate, CashFlowPotential, AcquisitionData
from app.models.comp import CompProperty, EstimateResult
from app.services.rentcast import rentcast
from app.services.comps import run_comps_analysis, calculate_adjustments, compute_final_estimate, _detect_density
from app.services.narrative import generate_report
from app.services.markets import get_market, list_markets

router = APIRouter()


async def _run_single_analysis(address: str, overrides: PropertyInput | None = None) -> AnalysisResponse:
    """Core analysis pipeline — reused by single and batch endpoints."""
    input_data = overrides or PropertyInput(address=address)

    try:
        value_result, rent_estimate = await asyncio.gather(
            rentcast.get_value_estimate(address),
            rentcast.get_rent_estimate(address),
        )
    except Exception as e:
        raise HTTPException(
            422,
            f"Could not find property data for that address. Check the address and try again. ({type(e).__name__})"
        )

    _, _, _, raw_comps, avg_dom, avm_subject = value_result

    if avm_subject:
        property_data = avm_subject
    else:
        property_data = PropertyData(address=address)

    if property_data.bedrooms is None:
        try:
            full_property = await rentcast.get_property(address)
            for field in ("bedrooms", "bathrooms", "sqft", "lot_size", "year_built", "property_type", "county"):
                if getattr(property_data, field) is None and getattr(full_property, field) is not None:
                    setattr(property_data, field, getattr(full_property, field))
        except Exception:
            pass

    if input_data.bedrooms is not None:
        property_data.bedrooms = input_data.bedrooms
    if input_data.bathrooms is not None:
        property_data.bathrooms = input_data.bathrooms
    if input_data.sqft is not None:
        property_data.sqft = input_data.sqft
    if input_data.lot_size is not None:
        property_data.lot_size = input_data.lot_size
    if input_data.year_built is not None:
        property_data.year_built = input_data.year_built

    # Resolve market constants: explicit choice > auto-detect from city
    mc = get_market(market_key=input_data.market, city=property_data.city)

    selected_comps, estimate = run_comps_analysis(property_data, raw_comps, mc)

    narrative = generate_report(
        subject=property_data,
        comps=selected_comps,
        estimate=estimate,
        rent=rent_estimate,
        days_on_market=avg_dom,
    )

    db = await get_pool()

    prop_row = await db.fetchrow(
        """
        INSERT INTO properties (address, city, state, zip_code, county,
            latitude, longitude, property_type, bedrooms, bathrooms,
            sqft, lot_size, year_built, last_sale_date, last_sale_price, raw_api_data)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        RETURNING id
        """,
        property_data.address,
        property_data.city,
        property_data.state,
        property_data.zip_code,
        property_data.county,
        property_data.latitude,
        property_data.longitude,
        property_data.property_type,
        property_data.bedrooms,
        property_data.bathrooms,
        property_data.sqft,
        property_data.lot_size,
        property_data.year_built,
        property_data.last_sale_date,
        property_data.last_sale_price,
        None,
    )
    prop_id = prop_row["id"]

    analysis_row = await db.fetchrow(
        """
        INSERT INTO analyses (subject_property_id, estimated_value,
            value_range_low, value_range_high, estimated_rent,
            rent_range_low, rent_range_high, est_days_on_market,
            adjustments_json, narrative_text)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING id, created_at
        """,
        prop_id,
        estimate.estimated_value,
        estimate.range_low,
        estimate.range_high,
        rent_estimate.rent,
        rent_estimate.range_low,
        rent_estimate.range_high,
        avg_dom,
        json.dumps({
            c.address: c.adjustments for c in selected_comps if c.adjustments
        }),
        narrative,
    )
    analysis_id = analysis_row["id"]

    for comp in selected_comps:
        await db.execute(
            """
            INSERT INTO comp_properties (analysis_id, address, sale_price,
                sale_date, bedrooms, bathrooms, sqft, lot_size, year_built,
                property_type, distance_miles, correlation, adjusted_price, adjustments)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            """,
            analysis_id,
            comp.address,
            comp.sale_price,
            comp.sale_date,
            comp.bedrooms,
            comp.bathrooms,
            comp.sqft,
            comp.lot_size,
            comp.year_built,
            comp.property_type,
            comp.distance_miles,
            comp.correlation,
            comp.adjusted_price,
            json.dumps(comp.adjustments) if comp.adjustments else None,
        )

    comp_rows = await db.fetch(
        "SELECT * FROM comp_properties WHERE analysis_id = $1 ORDER BY correlation DESC",
        analysis_id,
    )

    response_comps = [
        CompProperty(
            id=r["id"],
            address=r["address"],
            sale_price=r["sale_price"],
            sale_date=r["sale_date"],
            bedrooms=r["bedrooms"],
            bathrooms=float(r["bathrooms"]) if r["bathrooms"] else None,
            sqft=r["sqft"],
            lot_size=r["lot_size"],
            year_built=r["year_built"],
            property_type=r.get("property_type"),
            distance_miles=float(r["distance_miles"]) if r["distance_miles"] else None,
            correlation=float(r["correlation"]) if r["correlation"] else None,
            adjusted_price=r["adjusted_price"],
            adjustments=json.loads(r["adjustments"]) if r["adjustments"] else None,
        )
        for r in comp_rows
    ]

    property_data.id = prop_id

    # Cash flow potential from comp price range
    comp_prices = [c.sale_price for c in response_comps if c.sale_price]
    cfp = None
    if comp_prices:
        cfp = CashFlowPotential(
            comp_price_low=min(comp_prices),
            comp_price_high=max(comp_prices),
            median_price=int(_stats.median(comp_prices)),
        )

    acq = None
    if property_data.last_sale_date or property_data.last_sale_price:
        acq = AcquisitionData(
            last_sale_date=str(property_data.last_sale_date) if property_data.last_sale_date else None,
            last_sale_price=property_data.last_sale_price,
        )

    return AnalysisResponse(
        id=analysis_id,
        subject=property_data,
        estimate=estimate,
        rent=rent_estimate,
        days_on_market=avg_dom,
        comps=response_comps,
        narrative=narrative,
        cash_flow_potential=cfp,
        acquisition=acq,
        created_at=analysis_row["created_at"],
    )


@router.post("/analysis")
async def create_analysis(input: PropertyInput) -> AnalysisResponse:
    if not input.address or not input.address.strip():
        raise HTTPException(422, "Address is required.")
    return await _run_single_analysis(input.address.strip(), input)


# --- Batch analysis ---

class BatchInput(BaseModel):
    addresses: list[str]


class BatchResultItem(BaseModel):
    address: str
    status: str  # "success" | "error"
    analysis: AnalysisResponse | None = None
    error: str | None = None


class BatchResponse(BaseModel):
    total: int
    succeeded: int
    failed: int
    results: list[BatchResultItem]


@router.post("/analysis/batch")
async def batch_analysis(input: BatchInput) -> BatchResponse:
    if len(input.addresses) > 25:
        raise HTTPException(status_code=400, detail="Maximum 25 addresses per batch")

    # Run analyses sequentially to avoid hammering the API
    # (RentCast rate limits + we have 50 calls/month)
    results: list[BatchResultItem] = []
    for addr in input.addresses:
        addr = addr.strip()
        if not addr:
            continue
        try:
            analysis = await _run_single_analysis(addr)
            results.append(BatchResultItem(
                address=addr,
                status="success",
                analysis=analysis,
            ))
        except Exception as e:
            results.append(BatchResultItem(
                address=addr,
                status="error",
                error=str(e),
            ))

    succeeded = sum(1 for r in results if r.status == "success")
    return BatchResponse(
        total=len(results),
        succeeded=succeeded,
        failed=len(results) - succeeded,
        results=results,
    )


# --- Retrieve / list ---

@router.get("/analysis/{analysis_id}")
async def get_analysis(analysis_id: UUID) -> AnalysisResponse:
    db = await get_pool()

    row = await db.fetchrow("SELECT * FROM analyses WHERE id = $1", analysis_id)
    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found")

    prop = await db.fetchrow(
        "SELECT * FROM properties WHERE id = $1", row["subject_property_id"]
    )

    comp_rows = await db.fetch(
        "SELECT * FROM comp_properties WHERE analysis_id = $1 ORDER BY correlation DESC",
        analysis_id,
    )

    subject = PropertyData(
        id=prop["id"],
        address=prop["address"],
        city=prop["city"],
        state=prop["state"],
        zip_code=prop["zip_code"],
        county=prop["county"],
        latitude=prop["latitude"],
        longitude=prop["longitude"],
        property_type=prop["property_type"],
        bedrooms=prop["bedrooms"],
        bathrooms=float(prop["bathrooms"]) if prop["bathrooms"] else None,
        sqft=prop["sqft"],
        lot_size=prop["lot_size"],
        year_built=prop["year_built"],
        last_sale_date=prop["last_sale_date"],
        last_sale_price=prop["last_sale_price"],
    )

    comps = [
        CompProperty(
            id=r["id"],
            address=r["address"],
            sale_price=r["sale_price"],
            sale_date=r["sale_date"],
            bedrooms=r["bedrooms"],
            bathrooms=float(r["bathrooms"]) if r["bathrooms"] else None,
            sqft=r["sqft"],
            lot_size=r["lot_size"],
            year_built=r["year_built"],
            property_type=r.get("property_type"),
            distance_miles=float(r["distance_miles"]) if r["distance_miles"] else None,
            correlation=float(r["correlation"]) if r["correlation"] else None,
            adjusted_price=r["adjusted_price"],
            adjustments=json.loads(r["adjustments"]) if r["adjustments"] else None,
        )
        for r in comp_rows
    ]

    comp_prices = [c.sale_price for c in comps if c.sale_price]
    cfp = None
    if comp_prices:
        cfp = CashFlowPotential(
            comp_price_low=min(comp_prices),
            comp_price_high=max(comp_prices),
            median_price=int(_stats.median(comp_prices)),
        )

    acq = None
    if subject.last_sale_date or subject.last_sale_price:
        acq = AcquisitionData(
            last_sale_date=str(subject.last_sale_date) if subject.last_sale_date else None,
            last_sale_price=subject.last_sale_price,
        )

    return AnalysisResponse(
        id=row["id"],
        subject=subject,
        estimate=EstimateResult(
            estimated_value=row["estimated_value"],
            range_low=row["value_range_low"],
            range_high=row["value_range_high"],
        ),
        rent=RentEstimate(
            rent=row["estimated_rent"],
            range_low=row["rent_range_low"],
            range_high=row["rent_range_high"],
        ),
        days_on_market=row["est_days_on_market"],
        comps=comps,
        narrative=row["narrative_text"],
        cash_flow_potential=cfp,
        acquisition=acq,
        created_at=row["created_at"],
    )


class AnalysisSummary(BaseModel):
    id: UUID
    address: str
    estimated_value: int
    created_at: datetime


@router.get("/markets")
async def get_markets():
    """List all available market presets with their adjustment constants."""
    return list_markets()


@router.get("/analyses")
async def list_analyses() -> list[AnalysisSummary]:
    db = await get_pool()
    rows = await db.fetch(
        """
        SELECT a.id, p.address, a.estimated_value, a.created_at
        FROM analyses a
        JOIN properties p ON p.id = a.subject_property_id
        ORDER BY a.created_at DESC
        LIMIT 20
        """
    )
    return [
        AnalysisSummary(
            id=r["id"],
            address=r["address"],
            estimated_value=r["estimated_value"],
            created_at=r["created_at"],
        )
        for r in rows
    ]


# --- Manual comp import ---

class ManualComp(BaseModel):
    address: str
    sale_price: int
    sale_date: str | None = None
    bedrooms: int | None = None
    bathrooms: float | None = None
    sqft: int | None = None
    lot_size: int | None = None
    year_built: int | None = None
    property_type: str | None = None
    status: str | None = None  # "active", "under_contract", "expired", "sold"


class CustomAnalysisInput(BaseModel):
    address: str
    market: str | None = None
    bedrooms: int | None = None
    bathrooms: float | None = None
    sqft: int | None = None
    lot_size: int | None = None
    year_built: int | None = None
    manual_comps: list[ManualComp]


@router.post("/analysis/custom")
async def custom_analysis(input: CustomAnalysisInput) -> AnalysisResponse:
    """Run analysis with user-provided comps (actives, expireds, under contract, etc.)."""
    if not input.address.strip():
        raise HTTPException(422, "Address is required.")
    if not input.manual_comps:
        raise HTTPException(422, "At least one comparable property is required.")

    address = input.address.strip()

    # Try to get subject property data from RentCast (free if cached)
    try:
        full_property = await rentcast.get_property(address)
        property_data = full_property
    except Exception:
        property_data = PropertyData(address=address)

    # Apply overrides
    for field in ("bedrooms", "bathrooms", "sqft", "lot_size", "year_built"):
        val = getattr(input, field, None)
        if val is not None:
            setattr(property_data, field, val)

    # Try to get rent estimate
    try:
        rent_estimate = await rentcast.get_rent_estimate(address)
    except Exception:
        from app.models.report import RentEstimate as RE
        rent_estimate = RE(rent=0, range_low=0, range_high=0)

    # Convert manual comps to CompProperty objects
    from datetime import date as _date
    raw_comps = []
    for mc_input in input.manual_comps:
        sale_date = None
        if mc_input.sale_date:
            try:
                sale_date = _date.fromisoformat(mc_input.sale_date)
            except ValueError:
                pass

        raw_comps.append(CompProperty(
            address=mc_input.address,
            sale_price=mc_input.sale_price,
            sale_date=sale_date,
            bedrooms=mc_input.bedrooms,
            bathrooms=mc_input.bathrooms,
            sqft=mc_input.sqft,
            lot_size=mc_input.lot_size,
            year_built=mc_input.year_built,
            property_type=mc_input.property_type,
            correlation=0.95,  # Manual comps are assumed to be good picks
        ))

    mc = get_market(market_key=input.market, city=property_data.city)

    # Run the engine on user-provided comps
    density = _detect_density(raw_comps)
    for comp in raw_comps:
        result = calculate_adjustments(property_data, comp, mc, density)
        comp.adjusted_price = result.adjusted_price
        comp.adjustments = result.adjustments

    estimate = compute_final_estimate(raw_comps)

    narrative = generate_report(
        subject=property_data,
        comps=raw_comps,
        estimate=estimate,
        rent=rent_estimate,
        days_on_market=None,
    )

    # Store in DB
    db = await get_pool()

    prop_row = await db.fetchrow(
        """
        INSERT INTO properties (address, city, state, zip_code, county,
            latitude, longitude, property_type, bedrooms, bathrooms,
            sqft, lot_size, year_built, last_sale_date, last_sale_price, raw_api_data)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        RETURNING id
        """,
        property_data.address,
        property_data.city,
        property_data.state,
        property_data.zip_code,
        getattr(property_data, "county", None),
        property_data.latitude,
        property_data.longitude,
        property_data.property_type,
        property_data.bedrooms,
        property_data.bathrooms,
        property_data.sqft,
        property_data.lot_size,
        property_data.year_built,
        property_data.last_sale_date,
        property_data.last_sale_price,
        None,
    )
    prop_id = prop_row["id"]

    analysis_row = await db.fetchrow(
        """
        INSERT INTO analyses (subject_property_id, estimated_value,
            value_range_low, value_range_high, estimated_rent,
            rent_range_low, rent_range_high, est_days_on_market,
            adjustments_json, narrative_text)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING id, created_at
        """,
        prop_id,
        estimate.estimated_value,
        estimate.range_low,
        estimate.range_high,
        rent_estimate.rent,
        rent_estimate.range_low,
        rent_estimate.range_high,
        None,
        json.dumps({c.address: c.adjustments for c in raw_comps if c.adjustments}),
        narrative,
    )
    analysis_id = analysis_row["id"]

    for comp in raw_comps:
        await db.execute(
            """
            INSERT INTO comp_properties (analysis_id, address, sale_price,
                sale_date, bedrooms, bathrooms, sqft, lot_size, year_built,
                property_type, distance_miles, correlation, adjusted_price, adjustments)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            """,
            analysis_id, comp.address, comp.sale_price, comp.sale_date,
            comp.bedrooms, comp.bathrooms, comp.sqft, comp.lot_size,
            comp.year_built, comp.property_type, comp.distance_miles,
            comp.correlation, comp.adjusted_price,
            json.dumps(comp.adjustments) if comp.adjustments else None,
        )

    property_data.id = prop_id

    comp_prices = [c.sale_price for c in raw_comps if c.sale_price]
    cfp = None
    if comp_prices:
        cfp = CashFlowPotential(
            comp_price_low=min(comp_prices),
            comp_price_high=max(comp_prices),
            median_price=int(_stats.median(comp_prices)),
        )

    acq = None
    if property_data.last_sale_date or property_data.last_sale_price:
        acq = AcquisitionData(
            last_sale_date=str(property_data.last_sale_date) if property_data.last_sale_date else None,
            last_sale_price=property_data.last_sale_price,
        )

    return AnalysisResponse(
        id=analysis_id,
        subject=property_data,
        estimate=estimate,
        rent=rent_estimate,
        days_on_market=None,
        comps=raw_comps,
        narrative=narrative,
        cash_flow_potential=cfp,
        acquisition=acq,
        created_at=analysis_row["created_at"],
    )
