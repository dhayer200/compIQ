import statistics
from datetime import date

from app.models.property import PropertyData
from app.models.comp import CompProperty, AdjustmentResult, EstimateResult
from app.services.markets import MarketConstants, DEFAULT


# ── Density detection ────────────────────────────────────────────────

def _detect_density(comps: list[CompProperty]) -> str:
    """Classify the area as urban/suburban/rural based on comp distances and lot sizes."""
    distances = [c.distance_miles for c in comps if c.distance_miles is not None]
    lots = [c.lot_size for c in comps if c.lot_size and c.lot_size > 0]

    if not distances:
        return "suburban"  # safe default

    avg_dist = statistics.mean(distances)
    median_lot = statistics.median(lots) if lots else 7000

    # Rural: comps are spread far apart, lots are large
    if avg_dist > 1.5 or median_lot > 30000:
        return "rural"
    # Urban: comps are very close, lots are small
    if avg_dist < 0.5 and median_lot < 5000:
        return "urban"
    return "suburban"


# ── Property type normalization ───────────────────────────────────────

_TYPE_GROUPS = {
    "single family": "sfh",
    "single-family": "sfh",
    "single family residential": "sfh",
    "condo": "condo",
    "condominium": "condo",
    "townhouse": "townhouse",
    "townhome": "townhouse",
    "multi family": "multi",
    "multi-family": "multi",
    "duplex": "multi",
    "triplex": "multi",
    "apartment": "multi",
}


def _normalize_type(prop_type: str | None) -> str | None:
    if not prop_type:
        return None
    return _TYPE_GROUPS.get(prop_type.lower().strip(), prop_type.lower().strip())


# ── Selection ────────────────────────────────────────────────────────

def select_comps(
    subject: PropertyData, raw_comps: list[CompProperty], mc: MarketConstants = DEFAULT
) -> list[CompProperty]:
    """Filter and rank comparables by similarity to subject."""
    today = date.today()
    density = _detect_density(raw_comps)
    subj_type = _normalize_type(subject.property_type)

    # Relax thresholds for rural areas where comps are scarce
    max_dist = mc.max_distance_miles
    max_sqft_pct = mc.max_sqft_diff_pct
    max_age_months = mc.max_sale_age_months
    if density == "rural":
        max_dist = max(mc.max_distance_miles, 5.0)
        max_sqft_pct = max(mc.max_sqft_diff_pct, 0.50)
        max_age_months = max(mc.max_sale_age_months, 18)

    same_type = []
    diff_type = []
    for comp in raw_comps:
        if subject.sqft and comp.sqft:
            if abs(subject.sqft - comp.sqft) > subject.sqft * max_sqft_pct:
                continue

        if subject.bedrooms is not None and comp.bedrooms is not None:
            if abs(subject.bedrooms - comp.bedrooms) > mc.max_bedroom_diff:
                continue

        if comp.distance_miles is not None:
            if comp.distance_miles > max_dist:
                continue

        if comp.sale_date:
            months_old = (today - comp.sale_date).days / 30
            if months_old > max_age_months:
                continue

        # Segment by property type
        comp_type = _normalize_type(comp.property_type)
        if subj_type and comp_type and comp_type != subj_type:
            diff_type.append(comp)
        else:
            same_type.append(comp)

    # Prefer same-type comps; only backfill with different types if needed
    same_type.sort(key=lambda c: c.correlation or 0, reverse=True)
    diff_type.sort(key=lambda c: c.correlation or 0, reverse=True)

    result = same_type[:mc.max_comps]
    if len(result) < 3:
        result.extend(diff_type[:mc.max_comps - len(result)])

    return result[:mc.max_comps]


# ── Distance decay ──────────────────────────────────────────────────

def _distance_adjustment(distance: float, base_rate: int, density: str) -> int:
    """Exponential distance decay instead of flat linear penalty.

    Closer comps get almost no penalty. Penalty ramps up exponentially.
    Rural areas get a gentler curve since comps are naturally farther apart.
    """
    if distance <= 0.25:
        return 0  # Very close, no penalty

    # Free zone before penalties kick in (varies by density)
    free_zone = {"urban": 0.25, "suburban": 0.5, "rural": 1.5}[density]
    if distance <= free_zone:
        return 0

    excess = distance - free_zone

    # Decay factor: steeper in urban, gentler in rural
    decay_exp = {"urban": 1.8, "suburban": 1.4, "rural": 1.1}[density]

    penalty = base_rate * (excess ** decay_exp)
    return int(-penalty)


# ── Recency weighting ───────────────────────────────────────────────

def _time_adjustment(sale_price: int, sale_date: date, today: date,
                     monthly_rate: float) -> int:
    """Graduated time adjustment — recent sales get near-zero adjustment,
    older sales get increasingly aggressive appreciation applied."""
    months_old = (today - sale_date).days / 30

    if months_old <= 1:
        return 0  # Within last month, no adjustment needed

    # First 3 months: use the base rate
    # 3-6 months: 1.2x the rate (market may have shifted)
    # 6-12 months: 1.5x the rate (significant time gap)
    # 12+ months: 2x the rate (stale data)
    if months_old <= 3:
        effective_rate = monthly_rate
    elif months_old <= 6:
        effective_rate = monthly_rate * 1.2
    elif months_old <= 12:
        effective_rate = monthly_rate * 1.5
    else:
        effective_rate = monthly_rate * 2.0

    return int(sale_price * effective_rate * months_old)


# ── Price-relative adjustments ───────────────────────────────────────

def _scale_adjustment(sale_price: int, default_price: int = 400000) -> float:
    """Scale adjustment factors relative to property price tier.

    A $5K bedroom adjustment is huge on a $150K property but trivial on
    a $1.2M property. This scales adjustments proportionally.
    """
    if sale_price <= 0:
        return 1.0
    return max(0.5, min(2.5, sale_price / default_price))


# ── Core adjustment calculation ──────────────────────────────────────

def calculate_adjustments(
    subject: PropertyData, comp: CompProperty, mc: MarketConstants = DEFAULT,
    density: str = "suburban"
) -> AdjustmentResult:
    """Calculate dollar adjustments to make comp comparable to subject."""
    adjustments: dict[str, int] = {}
    today = date.today()

    # Price-relative scaling factor
    scale = _scale_adjustment(comp.sale_price)

    # Square footage — scale by price tier
    if subject.sqft and comp.sqft:
        sqft_diff = subject.sqft - comp.sqft
        adjustments["sqft"] = int(sqft_diff * mc.price_per_sqft * scale)

    # Bedrooms — scale by price tier
    if subject.bedrooms is not None and comp.bedrooms is not None:
        bed_diff = subject.bedrooms - comp.bedrooms
        adjustments["bedrooms"] = int(bed_diff * mc.price_per_bedroom * scale)

    # Bathrooms — scale by price tier
    if subject.bathrooms is not None and comp.bathrooms is not None:
        bath_diff = subject.bathrooms - comp.bathrooms
        adjustments["bathrooms"] = int(bath_diff * mc.price_per_bathroom * scale)

    # Lot size — more important in suburban/rural
    if subject.lot_size and comp.lot_size:
        lot_diff = subject.lot_size - comp.lot_size
        lot_multiplier = {"urban": 0.5, "suburban": 1.0, "rural": 2.0}[density]
        adjustments["lot_size"] = int(lot_diff * mc.price_per_lot_sqft * lot_multiplier)

    # Age / year built — scale by price tier
    subj_year = subject.year_built or 2000
    comp_year = comp.year_built or 2000
    age_diff = subj_year - comp_year
    adjustments["age"] = int(age_diff * mc.price_per_year_age * scale)

    # Location — exponential distance decay
    if comp.distance_miles is not None:
        adjustments["location"] = _distance_adjustment(
            comp.distance_miles, mc.price_per_mile_beyond_half, density
        )

    # Time — graduated recency adjustment
    if comp.sale_date:
        adjustments["time"] = _time_adjustment(
            comp.sale_price, comp.sale_date, today, mc.monthly_appreciation_rate
        )

    adjusted_price = comp.sale_price + sum(adjustments.values())
    return AdjustmentResult(adjustments=adjustments, adjusted_price=adjusted_price)


# ── Final estimate ───────────────────────────────────────────────────

def compute_final_estimate(
    adjusted_comps: list[CompProperty],
) -> EstimateResult:
    """Weighted average of adjusted comp prices, weighted by correlation.
    Comps with extreme $/sqft (likely different condition) get dampened weight."""
    if not adjusted_comps:
        return EstimateResult(estimated_value=0, range_low=0, range_high=0)

    weights = [c.correlation or 0.5 for c in adjusted_comps]
    prices = [c.adjusted_price or c.sale_price for c in adjusted_comps]

    # Dampen outliers: if a comp's $/sqft deviates >30% from the group
    # median, halve its weight. This catches quality/condition differences
    # without making assumptions about what caused them.
    ppsf = [c.sale_price / c.sqft for c in adjusted_comps if c.sqft and c.sqft > 0]
    if len(ppsf) >= 3:
        med_ppsf = statistics.median(ppsf)
        for i, c in enumerate(adjusted_comps):
            if c.sqft and c.sqft > 0 and med_ppsf > 0:
                deviation = abs(c.sale_price / c.sqft - med_ppsf) / med_ppsf
                if deviation > 0.30:
                    weights[i] *= 0.5

    total_weight = sum(weights)

    if total_weight == 0:
        weighted_price = int(sum(prices) / len(prices))
    else:
        weighted_price = int(
            sum(p * w for p, w in zip(prices, weights)) / total_weight
        )

    if len(prices) > 1:
        std_dev = statistics.stdev(prices)
    else:
        std_dev = weighted_price * 0.05

    range_spread = max(std_dev, weighted_price * 0.05)

    return EstimateResult(
        estimated_value=weighted_price,
        range_low=int(weighted_price - range_spread),
        range_high=int(weighted_price + range_spread),
    )


# ── Pipeline ─────────────────────────────────────────────────────────

def run_comps_analysis(
    subject: PropertyData,
    raw_comps: list[CompProperty],
    mc: MarketConstants = DEFAULT,
) -> tuple[list[CompProperty], EstimateResult]:
    """Full pipeline: detect density, select, adjust, estimate."""
    density = _detect_density(raw_comps)
    selected = select_comps(subject, raw_comps, mc)

    for comp in selected:
        result = calculate_adjustments(subject, comp, mc, density)
        comp.adjusted_price = result.adjusted_price
        comp.adjustments = result.adjustments

    estimate = compute_final_estimate(selected)
    return selected, estimate
