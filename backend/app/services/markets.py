"""Market-specific adjustment constants for Texas metros.

Values are derived from median $/sqft, typical bedroom premiums, lot value
patterns, and appreciation rates for each MSA.  They can be overridden
per-request via the API.

Sources for calibration:
- Texas A&M Real Estate Center quarterly reports
- Zillow Home Value Index trends (2023-2025)
- ACTRIS / NTREIS / HAR MLS market stats
"""

from dataclasses import dataclass, asdict


@dataclass(frozen=True)
class MarketConstants:
    name: str
    price_per_sqft: int
    price_per_bedroom: int
    price_per_bathroom: int
    price_per_lot_sqft: float
    price_per_year_age: int
    price_per_mile_beyond_half: int
    monthly_appreciation_rate: float
    # Selection thresholds
    max_sqft_diff_pct: float = 0.35
    max_bedroom_diff: int = 2
    max_distance_miles: float = 2.0
    max_sale_age_months: int = 12
    max_comps: int = 7

    def to_dict(self) -> dict:
        return asdict(self)


# ── Texas metro presets ──────────────────────────────────────────────

AUSTIN = MarketConstants(
    name="Austin",
    price_per_sqft=200,           # Austin median ~$280/sqft, adjustments are marginal so lower
    price_per_bedroom=15000,      # Strong premium in tight Austin inventory
    price_per_bathroom=10000,
    price_per_lot_sqft=3,         # Lots matter in suburbs (Cedar Park, Round Rock)
    price_per_year_age=1200,      # New construction premium is real in Austin
    price_per_mile_beyond_half=4000,  # Location-sensitive — urban core premium
    monthly_appreciation_rate=0.002,  # Cooled from 2021-22 boom, ~2.5% annual
)

DALLAS = MarketConstants(
    name="Dallas-Fort Worth",
    price_per_sqft=160,           # DFW median ~$190/sqft
    price_per_bedroom=12000,
    price_per_bathroom=8000,
    price_per_lot_sqft=2,
    price_per_year_age=800,
    price_per_mile_beyond_half=3000,
    monthly_appreciation_rate=0.003,  # ~3.5% annual, steadier than Austin
)

HOUSTON = MarketConstants(
    name="Houston",
    price_per_sqft=140,           # Houston median ~$160/sqft, more affordable
    price_per_bedroom=10000,
    price_per_bathroom=7500,
    price_per_lot_sqft=2,         # Larger lots common, lower marginal value
    price_per_year_age=700,
    price_per_mile_beyond_half=2500,  # Sprawl means distance matters less
    monthly_appreciation_rate=0.003,
)

SAN_ANTONIO = MarketConstants(
    name="San Antonio",
    price_per_sqft=130,           # SA median ~$150/sqft
    price_per_bedroom=8000,
    price_per_bathroom=6000,
    price_per_lot_sqft=1.5,
    price_per_year_age=600,
    price_per_mile_beyond_half=2000,
    monthly_appreciation_rate=0.003,
)

DEFAULT = MarketConstants(
    name="Default (National Avg)",
    price_per_sqft=150,
    price_per_bedroom=10000,
    price_per_bathroom=7500,
    price_per_lot_sqft=2,
    price_per_year_age=750,
    price_per_mile_beyond_half=3000,
    monthly_appreciation_rate=0.003,
)

# ── Market registry ──────────────────────────────────────────────────

MARKETS: dict[str, MarketConstants] = {
    "austin": AUSTIN,
    "dallas": DALLAS,
    "houston": HOUSTON,
    "san_antonio": SAN_ANTONIO,
    "default": DEFAULT,
}

# City names → market key (for auto-detection from address)
CITY_TO_MARKET: dict[str, str] = {
    # Austin MSA
    "austin": "austin",
    "round rock": "austin",
    "cedar park": "austin",
    "pflugerville": "austin",
    "leander": "austin",
    "georgetown": "austin",
    "kyle": "austin",
    "buda": "austin",
    "lakeway": "austin",
    "bee cave": "austin",
    "dripping springs": "austin",
    "hutto": "austin",
    "manor": "austin",
    "taylor": "austin",
    "bastrop": "austin",
    "san marcos": "austin",
    "liberty hill": "austin",
    # Dallas-Fort Worth MSA
    "dallas": "dallas",
    "fort worth": "dallas",
    "plano": "dallas",
    "irving": "dallas",
    "arlington": "dallas",
    "frisco": "dallas",
    "mckinney": "dallas",
    "denton": "dallas",
    "carrollton": "dallas",
    "richardson": "dallas",
    "garland": "dallas",
    "grand prairie": "dallas",
    "mesquite": "dallas",
    "allen": "dallas",
    "flower mound": "dallas",
    "mansfield": "dallas",
    "southlake": "dallas",
    "colleyville": "dallas",
    "prosper": "dallas",
    "celina": "dallas",
    "little elm": "dallas",
    "the colony": "dallas",
    "wylie": "dallas",
    "rockwall": "dallas",
    "rowlett": "dallas",
    "murphy": "dallas",
    "sachse": "dallas",
    "desoto": "dallas",
    "duncanville": "dallas",
    "cedar hill": "dallas",
    "midlothian": "dallas",
    "waxahachie": "dallas",
    # Houston MSA
    "houston": "houston",
    "sugar land": "houston",
    "katy": "houston",
    "pearland": "houston",
    "league city": "houston",
    "spring": "houston",
    "the woodlands": "houston",
    "cypress": "houston",
    "humble": "houston",
    "pasadena": "houston",
    "baytown": "houston",
    "missouri city": "houston",
    "friendswood": "houston",
    "richmond": "houston",
    "conroe": "houston",
    "tomball": "houston",
    "deer park": "houston",
    "la porte": "houston",
    "webster": "houston",
    "stafford": "houston",
    # San Antonio MSA
    "san antonio": "san_antonio",
    "new braunfels": "san_antonio",
    "schertz": "san_antonio",
    "cibolo": "san_antonio",
    "boerne": "san_antonio",
    "helotes": "san_antonio",
    "live oak": "san_antonio",
    "universal city": "san_antonio",
    "selma": "san_antonio",
    "converse": "san_antonio",
    "seguin": "san_antonio",
}


def detect_market(city: str | None) -> str:
    """Auto-detect market key from city name. Falls back to 'default'."""
    if not city:
        return "default"
    return CITY_TO_MARKET.get(city.lower().strip(), "default")


def get_market(market_key: str | None = None, city: str | None = None) -> MarketConstants:
    """Get market constants by explicit key or auto-detect from city."""
    if market_key and market_key in MARKETS:
        return MARKETS[market_key]
    return MARKETS[detect_market(city)]


def list_markets() -> list[dict]:
    """Return all available markets with their constants."""
    return [{"key": k, **v.to_dict()} for k, v in MARKETS.items()]
