import statistics
from collections import defaultdict
from datetime import date

from app.models.property import PropertyData
from app.models.comp import CompProperty, EstimateResult
from app.models.report import RentEstimate


FACTOR_NAMES = {
    "sqft": "differences in living area",
    "bedrooms": "bedroom count variations",
    "bathrooms": "bathroom count differences",
    "lot_size": "lot size differences",
    "age": "differences in property age",
    "location": "location proximity",
    "time": "market timing adjustments",
}


def _fmt(n: int) -> str:
    return f"${n:,}"


def generate_report(
    subject: PropertyData,
    comps: list[CompProperty],
    estimate: EstimateResult,
    rent: RentEstimate,
    days_on_market: int | None,
) -> str:
    sections = [
        _intro(subject, comps),
        _value_summary(comps, estimate),
        _comps_overview(comps),
        _adjustments_narrative(comps),
        _market_context(comps, days_on_market),
        _rent_section(rent, subject),
        _conclusion(estimate, rent, days_on_market),
    ]
    return "\n\n".join(s for s in sections if s)


def _intro(subject: PropertyData, comps: list[CompProperty]) -> str:
    parts = []
    if subject.bedrooms is not None:
        parts.append("studio" if subject.bedrooms == 0 else f"{subject.bedrooms}-bedroom")
    if subject.bathrooms:
        parts.append(f"{subject.bathrooms}-bathroom")
    desc = ", ".join(parts) if parts else "residential"

    sqft_str = f" with {subject.sqft:,} square feet of living space" if subject.sqft else ""
    year_str = f", built in {subject.year_built}" if subject.year_built else ""

    return (
        f"This comparative market analysis evaluates the {desc} property "
        f"located at {subject.address}"
        f"{', ' + subject.city if subject.city else ''}"
        f"{', ' + subject.state if subject.state else ''}"
        f"{sqft_str}{year_str}. "
        f"The analysis draws on {len(comps)} comparable recent sales "
        f"in the surrounding area to establish a market-supported value estimate."
    )


def _value_summary(comps: list[CompProperty], estimate: EstimateResult) -> str:
    spread = estimate.range_high - estimate.range_low
    spread_pct = (spread / estimate.estimated_value * 100) if estimate.estimated_value else 0

    if spread_pct < 8:
        confidence = "high degree of confidence"
        detail = "The comparable sales show strong agreement on value"
    elif spread_pct < 15:
        confidence = "reasonable confidence"
        detail = "The comparable sales show moderate consistency"
    else:
        confidence = "wider range of uncertainty"
        detail = "The comparable sales show notable variation"

    stability = "stable" if spread_pct < 10 else "showing some variability"

    return (
        f"Based on analysis of {len(comps)} comparable recent sales, "
        f"the estimated market value for this property is {_fmt(estimate.estimated_value)}, "
        f"with a probable range of {_fmt(estimate.range_low)} to {_fmt(estimate.range_high)}. "
        f"This estimate carries a {confidence}. {detail}, "
        f"suggesting the local market is {stability}."
    )


def _comps_overview(comps: list[CompProperty]) -> str:
    if not comps:
        return ""

    prices = [c.sale_price for c in comps]
    avg_price = int(statistics.mean(prices))
    min_price = min(prices)
    max_price = max(prices)

    distances = [c.distance_miles for c in comps if c.distance_miles is not None]
    avg_dist = statistics.mean(distances) if distances else 0

    sqfts = [c.sqft for c in comps if c.sqft]
    avg_sqft = int(statistics.mean(sqfts)) if sqfts else 0

    dist_desc = (
        "within very close proximity"
        if avg_dist < 0.5
        else "within a reasonable radius"
        if avg_dist < 1.0
        else "across a broader surrounding area"
    )

    size_str = f" The average comparable size is {avg_sqft:,} square feet." if avg_sqft else ""

    return (
        f"The {len(comps)} comparable properties sold at prices ranging from "
        f"{_fmt(min_price)} to {_fmt(max_price)}, with an average sale price of "
        f"{_fmt(avg_price)}. These comparables were sourced {dist_desc}, "
        f"averaging {avg_dist:.1f} miles from the subject property.{size_str}"
    )


def _adjustments_narrative(comps: list[CompProperty]) -> str:
    if not comps or not any(c.adjustments for c in comps):
        return ""

    all_adj: dict[str, list[int]] = defaultdict(list)
    for c in comps:
        if c.adjustments:
            for key, val in c.adjustments.items():
                all_adj[key].append(abs(val))

    if not all_adj:
        return ""

    biggest = max(all_adj, key=lambda k: statistics.mean(all_adj[k]))
    biggest_avg = int(statistics.mean(all_adj[biggest]))
    biggest_name = FACTOR_NAMES.get(biggest, biggest)

    # Find direction of net adjustments
    net_adjs = []
    for c in comps:
        if c.adjustments:
            net_adjs.append(sum(c.adjustments.values()))

    avg_net = int(statistics.mean(net_adjs)) if net_adjs else 0

    if avg_net > 0:
        direction = (
            "On average, comparables required upward adjustments, "
            "indicating the subject property has features that add value "
            "relative to recent sales in the area."
        )
    elif avg_net < 0:
        direction = (
            "On average, comparables required downward adjustments, "
            "suggesting the subject property may be slightly less competitive "
            "than some recent sales in certain features."
        )
    else:
        direction = (
            "Net adjustments were balanced across comparables, "
            "indicating the subject property aligns well with recent market activity."
        )

    return (
        f"The most significant adjustment factor across comparables was "
        f"{biggest_name}, averaging {_fmt(biggest_avg)} per property. "
        f"{direction}"
    )


def _market_context(comps: list[CompProperty], days_on_market: int | None) -> str:
    if days_on_market is None:
        return ""

    if days_on_market < 15:
        pace = "a fast-moving market where properties are selling quickly"
    elif days_on_market < 30:
        pace = "a healthy market with reasonable absorption"
    elif days_on_market < 60:
        pace = "a moderately paced market"
    else:
        pace = "a slower market where buyers have more negotiating leverage"

    # Check sale recency
    today = date.today()
    recent = [c for c in comps if c.sale_date and (today - c.sale_date).days < 90]
    older = [c for c in comps if c.sale_date and (today - c.sale_date).days >= 90]

    recency_note = ""
    if len(recent) > len(older):
        recency_note = (
            " The majority of comparable sales occurred within the last 90 days, "
            "providing strong recent market evidence."
        )
    elif older and recent:
        recency_note = (
            " The mix of recent and older sales suggests market conditions "
            "may have shifted during the analysis period, and time adjustments "
            "have been applied accordingly."
        )

    return (
        f"Comparable properties averaged {days_on_market} days on market, "
        f"indicating {pace}.{recency_note}"
    )


def _rent_section(rent: RentEstimate, subject: PropertyData) -> str:
    spread_pct = (
        (rent.range_high - rent.range_low) / rent.rent * 100
    ) if rent.rent else 0

    if spread_pct < 15:
        consistency = "Rental comparables show tight agreement"
    else:
        consistency = "Rental estimates show some spread"

    # Gross rent multiplier
    grm_note = ""
    if rent.rent and subject.last_sale_price:
        annual_rent = rent.rent * 12
        grm = subject.last_sale_price / annual_rent if annual_rent else 0
        if grm > 0:
            grm_note = (
                f" Based on the last recorded sale price, the gross rent multiplier "
                f"is approximately {grm:.1f}."
            )

    return (
        f"The estimated monthly rent for this property is {_fmt(rent.rent)}, "
        f"with a range of {_fmt(rent.range_low)} to {_fmt(rent.range_high)}. "
        f"{consistency}.{grm_note}"
    )


def _conclusion(
    estimate: EstimateResult, rent: RentEstimate, days_on_market: int | None
) -> str:
    dom_note = ""
    if days_on_market is not None:
        if days_on_market < 21:
            dom_note = " Current market conditions favor sellers, with properties moving quickly."
        elif days_on_market < 45:
            dom_note = " Market conditions are balanced, supporting the estimated value range."
        else:
            dom_note = " Extended marketing times suggest buyers may find negotiation room."

    cap_rate_note = ""
    if rent.rent and estimate.estimated_value:
        annual_rent = rent.rent * 12
        cap_rate = (annual_rent / estimate.estimated_value) * 100
        if cap_rate > 0:
            cap_rate_note = (
                f" At the estimated value, the property yields an approximate "
                f"gross capitalization rate of {cap_rate:.1f}%."
            )

    return (
        f"In summary, the subject property is estimated to be valued between "
        f"{_fmt(estimate.range_low)} and {_fmt(estimate.range_high)}, "
        f"with a most probable value of {_fmt(estimate.estimated_value)}. "
        f"Expected monthly rental income is {_fmt(rent.rent)}.{cap_rate_note}{dom_note}"
    )
