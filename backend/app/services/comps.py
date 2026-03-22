import statistics
from datetime import date

from app.models.property import PropertyData
from app.models.comp import CompProperty, AdjustmentResult, EstimateResult

# Adjustment constants (national averages, tunable per market)
PRICE_PER_SQFT = 100
PRICE_PER_BEDROOM = 5000
PRICE_PER_BATHROOM = 7500
PRICE_PER_LOT_SQFT = 1
PRICE_PER_YEAR_AGE = 500
PRICE_PER_MILE_BEYOND_HALF = 2000
MONTHLY_APPRECIATION_RATE = 0.003

# Selection thresholds
MAX_SQFT_DIFF_PCT = 0.40
MAX_BEDROOM_DIFF = 2
MAX_DISTANCE_MILES = 2.0
MAX_SALE_AGE_MONTHS = 12
MIN_COMPS = 3
MAX_COMPS = 7


def select_comps(
    subject: PropertyData, raw_comps: list[CompProperty]
) -> list[CompProperty]:
    """Filter and rank comparables by similarity to subject."""
    today = date.today()
    filtered = []

    for comp in raw_comps:
        # Sqft filter
        if subject.sqft and comp.sqft:
            if abs(subject.sqft - comp.sqft) > subject.sqft * MAX_SQFT_DIFF_PCT:
                continue

        # Bedroom filter
        if subject.bedrooms is not None and comp.bedrooms is not None:
            if abs(subject.bedrooms - comp.bedrooms) > MAX_BEDROOM_DIFF:
                continue

        # Distance filter
        if comp.distance_miles is not None:
            if comp.distance_miles > MAX_DISTANCE_MILES:
                continue

        # Sale age filter
        if comp.sale_date:
            months_old = (today - comp.sale_date).days / 30
            if months_old > MAX_SALE_AGE_MONTHS:
                continue

        filtered.append(comp)

    # Sort by correlation (highest first), then take top N
    filtered.sort(key=lambda c: c.correlation or 0, reverse=True)
    return filtered[:MAX_COMPS]


def calculate_adjustments(
    subject: PropertyData, comp: CompProperty
) -> AdjustmentResult:
    """Calculate dollar adjustments to make comp comparable to subject."""
    adjustments: dict[str, int] = {}
    today = date.today()

    # Square footage
    if subject.sqft and comp.sqft:
        sqft_diff = subject.sqft - comp.sqft
        adjustments["sqft"] = sqft_diff * PRICE_PER_SQFT

    # Bedrooms
    if subject.bedrooms is not None and comp.bedrooms is not None:
        bed_diff = subject.bedrooms - comp.bedrooms
        adjustments["bedrooms"] = bed_diff * PRICE_PER_BEDROOM

    # Bathrooms
    if subject.bathrooms is not None and comp.bathrooms is not None:
        bath_diff = subject.bathrooms - comp.bathrooms
        adjustments["bathrooms"] = int(bath_diff * PRICE_PER_BATHROOM)

    # Lot size
    if subject.lot_size and comp.lot_size:
        lot_diff = subject.lot_size - comp.lot_size
        adjustments["lot_size"] = lot_diff * PRICE_PER_LOT_SQFT

    # Age / year built
    subj_year = subject.year_built or 2000
    comp_year = comp.year_built or 2000
    age_diff = subj_year - comp_year
    adjustments["age"] = age_diff * PRICE_PER_YEAR_AGE

    # Location / distance penalty
    if comp.distance_miles is not None:
        penalty = max(0, comp.distance_miles - 0.5) * -PRICE_PER_MILE_BEYOND_HALF
        adjustments["location"] = int(penalty)

    # Time adjustment (market appreciation for older sales)
    if comp.sale_date:
        months_old = (today - comp.sale_date).days / 30
        time_adj = comp.sale_price * MONTHLY_APPRECIATION_RATE * months_old
        adjustments["time"] = int(time_adj)

    adjusted_price = comp.sale_price + sum(adjustments.values())
    return AdjustmentResult(adjustments=adjustments, adjusted_price=adjusted_price)


def compute_final_estimate(
    adjusted_comps: list[CompProperty],
) -> EstimateResult:
    """Weighted average of adjusted comp prices, weighted by correlation."""
    if not adjusted_comps:
        return EstimateResult(estimated_value=0, range_low=0, range_high=0)

    weights = [c.correlation or 0.5 for c in adjusted_comps]
    prices = [c.adjusted_price or c.sale_price for c in adjusted_comps]
    total_weight = sum(weights)

    if total_weight == 0:
        weighted_price = int(sum(prices) / len(prices))
    else:
        weighted_price = int(
            sum(p * w for p, w in zip(prices, weights)) / total_weight
        )

    # Range: std deviation or 5%, whichever is larger
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


def run_comps_analysis(
    subject: PropertyData, raw_comps: list[CompProperty]
) -> tuple[list[CompProperty], EstimateResult]:
    """Full pipeline: select, adjust, estimate."""
    selected = select_comps(subject, raw_comps)

    for comp in selected:
        result = calculate_adjustments(subject, comp)
        comp.adjusted_price = result.adjusted_price
        comp.adjustments = result.adjustments

    estimate = compute_final_estimate(selected)
    return selected, estimate
