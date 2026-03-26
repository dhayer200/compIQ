"""Back-test the comps engine against RentCast's AVM.

For each test address:
1. Pull AVM data (which includes the RentCast estimated value)
2. Run our comps engine with market-specific constants
3. Compare our estimate to RentCast's AVM estimate
4. Report error metrics (MAE, MAPE, median error)

Usage:
    python -m scripts.backtest                    # Run with default test addresses
    python -m scripts.backtest --market austin    # Test specific market
    python -m scripts.backtest --addresses file.txt  # Custom address list

NOTE: Each address uses 2 API calls (value + rent). With 50 free calls/month,
      you can back-test ~25 addresses per month.
"""

import asyncio
import argparse
import statistics
from pathlib import Path

# Fix imports when running as script
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db import init_db
from app.services.rentcast import rentcast
from app.services.comps import run_comps_analysis
from app.services.markets import get_market, MARKETS, MarketConstants


# Sample addresses for each Texas metro (real residential addresses)
TEST_ADDRESSES = {
    "austin": [
        "14408 Laurinburg Dr, Austin, TX 78717",
        "4505 Duval St, Austin, TX 78751",
        "11400 W Parmer Ln, Cedar Park, TX 78613",
        "1401 E Old Settlers Blvd, Round Rock, TX 78665",
    ],
    "dallas": [
        "3000 Blackburn St, Dallas, TX 75204",
        "5200 Keller Springs Rd, Dallas, TX 75248",
        "8600 Preston Rd, Plano, TX 75024",
    ],
    "houston": [
        "1200 Post Oak Blvd, Houston, TX 77056",
        "14000 Memorial Dr, Houston, TX 77079",
        "2700 Revere St, Houston, TX 77098",
    ],
    "san_antonio": [
        "100 E Houston St, San Antonio, TX 78205",
        "18700 Hardy Oak Blvd, San Antonio, TX 78258",
    ],
}


async def test_single(address: str, mc: MarketConstants) -> dict | None:
    """Run engine on one address, return comparison metrics."""
    try:
        # Get RentCast data
        value_result = await rentcast.get_value_estimate(address)
        rentcast_price, rc_low, rc_high, raw_comps, avg_dom, avm_subject = value_result

        if not raw_comps:
            print(f"  SKIP {address} — no comps returned")
            return None

        # Build subject
        from app.models.property import PropertyData
        if avm_subject:
            subject = avm_subject
        else:
            subject = PropertyData(address=address)

        # Run our engine
        selected_comps, our_estimate = run_comps_analysis(subject, raw_comps, mc)

        if our_estimate.estimated_value == 0:
            print(f"  SKIP {address} — engine returned $0")
            return None

        # Compare
        our_val = our_estimate.estimated_value
        rc_val = rentcast_price
        error = our_val - rc_val
        pct_error = (error / rc_val * 100) if rc_val else 0

        in_range = rc_low <= our_val <= rc_high

        print(f"  {address}")
        print(f"    RentCast AVM: ${rc_val:>10,}  (range: ${rc_low:,} – ${rc_high:,})")
        print(f"    Our estimate: ${our_val:>10,}  (range: ${our_estimate.range_low:,} – ${our_estimate.range_high:,})")
        print(f"    Error:        ${error:>+10,}  ({pct_error:+.1f}%)")
        print(f"    Within RC range: {'YES' if in_range else 'NO'}")
        print(f"    Comps used: {len(selected_comps)}, Market: {mc.name}")
        print()

        return {
            "address": address,
            "rentcast_value": rc_val,
            "our_value": our_val,
            "error": error,
            "abs_error": abs(error),
            "pct_error": pct_error,
            "abs_pct_error": abs(pct_error),
            "in_rc_range": in_range,
            "comps_used": len(selected_comps),
        }

    except Exception as e:
        print(f"  ERROR {address}: {e}")
        return None


async def run_backtest(market_key: str | None, addresses: list[str] | None):
    await init_db()

    if addresses:
        mc = get_market(market_key)
        test_list = [(addr, mc) for addr in addresses]
    elif market_key:
        mc = get_market(market_key)
        addrs = TEST_ADDRESSES.get(market_key, [])
        if not addrs:
            print(f"No test addresses for market '{market_key}'")
            return
        test_list = [(addr, mc) for addr in addrs]
    else:
        # Test all markets
        test_list = []
        for mkt, addrs in TEST_ADDRESSES.items():
            mc = get_market(mkt)
            for addr in addrs:
                test_list.append((addr, mc))

    print(f"\n{'='*70}")
    print(f"COMPS ENGINE BACK-TEST")
    print(f"Testing {len(test_list)} addresses")
    print(f"{'='*70}\n")

    results = []
    for addr, mc in test_list:
        result = await test_single(addr, mc)
        if result:
            results.append(result)

    if not results:
        print("No results to analyze.")
        return

    # Summary metrics
    abs_errors = [r["abs_error"] for r in results]
    abs_pct_errors = [r["abs_pct_error"] for r in results]
    in_range_count = sum(1 for r in results if r["in_rc_range"])

    print(f"\n{'='*70}")
    print(f"SUMMARY ({len(results)} properties tested)")
    print(f"{'='*70}")
    print(f"  Mean Absolute Error (MAE):    ${statistics.mean(abs_errors):,.0f}")
    print(f"  Median Absolute Error:        ${statistics.median(abs_errors):,.0f}")
    print(f"  Mean Abs % Error (MAPE):      {statistics.mean(abs_pct_errors):.1f}%")
    print(f"  Median Abs % Error:           {statistics.median(abs_pct_errors):.1f}%")
    if len(abs_errors) > 1:
        print(f"  Std Dev of Error:             ${statistics.stdev(abs_errors):,.0f}")
    print(f"  Within RentCast Range:        {in_range_count}/{len(results)} ({in_range_count/len(results)*100:.0f}%)")
    print()

    # Per-market breakdown
    markets_seen = set()
    for r in results:
        addr = r["address"]
        for mkt, addrs in TEST_ADDRESSES.items():
            if addr in addrs:
                markets_seen.add(mkt)

    if len(markets_seen) > 1:
        print("Per-market breakdown:")
        for mkt in sorted(markets_seen):
            mkt_results = [r for r in results if r["address"] in TEST_ADDRESSES.get(mkt, [])]
            if mkt_results:
                mape = statistics.mean([r["abs_pct_error"] for r in mkt_results])
                print(f"  {mkt:>12}: MAPE {mape:.1f}% ({len(mkt_results)} properties)")
        print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Back-test comps engine")
    parser.add_argument("--market", type=str, help="Market key (austin, dallas, houston, san_antonio)")
    parser.add_argument("--addresses", type=str, help="Path to text file with addresses (one per line)")
    args = parser.parse_args()

    addresses = None
    if args.addresses:
        addresses = [l.strip() for l in Path(args.addresses).read_text().splitlines() if l.strip()]

    asyncio.run(run_backtest(args.market, addresses))
