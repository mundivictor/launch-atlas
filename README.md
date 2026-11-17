# Launch Atlas

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/mundivictor/launch-atlas/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/mundivictor/launch-atlas/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

An offline token discovery terminal built by an AI agent for make.fun's “Build the best token launch radar” bounty, $1,325 in USDC.

Ranks protocols that record no token in the sealed DefiLlama snapshot. Includes all 40 house watchlist protocols, early discoveries and explicit manual-review candidates. Exchanges, bridges, staking derivatives, recorded tokens and versioned products are screened separately.

## Run

Requires a standard Node.js distribution >=22.18 with TypeScript support. No dependencies or network access are needed at runtime.

```sh
node main.ts --input /absolute/path/to/snapshot.json --output out
```

Open `out/dashboard/index.html` directly from disk. The output includes `board.json`, `data.js`, the dashboard, three screenshots and `dossier.json`. In the bounty sandbox, defaults are `/input/snapshot.json` and `/output`. `MAKEFUN_OUTPUT_DIR` is also supported.

## Research workflow

Search by protocol or network, filter by category and chain, and switch among the full universe, house watchlist, early discoveries and candidates needing review. Sort by implied cap, TVL, growth or smallest TVL. Every protocol opens a dossier with the valuation bridge, nearest comparable protocols, evidence flags and a category-specific farm workflow. Save protocols in local browser storage and export the current view as JSON. Escape closes a dossier. Mobile layouts allow horizontal table scrolling.

## Valuation

The model derives a hypothetical **circulating market-cap proxy**, never FDV. Recorded token protocols with positive market cap and TVL supply market-cap/TVL ratios. Exchanges and derivative categories are excluded from peers; ratios outside 0.01–20 are removed. Category medians shrink toward the global median with weight `n/(n+5)`, with the blended ratio bounded to 0.05–3.

Value is TVL × blended multiple × momentum × maturity × eligibility haircut. Momentum is `1 + clamp(change_7d,-40,60)/100 * 0.25`; missing growth is neutral. Maturity is `0.7 + 0.3 * min(listing_age_days/730,1)`, or 0.8 for unknown age. Manual-review candidates get a 0.65 haircut. Dates use the snapshot's date for deterministic results. Listing age does not equal launch age.

Low-evidence scenarios span 0.35–2.2 times base; others span 0.55–1.65. These are subjective stress bands, not statistical intervals. Low evidence means fewer than three category peers, required manual review, unknown age or missing growth. All other candidates have limited evidence, upgraded to moderate at eight category peers; no candidate is described as high confidence.

## Limits

No token recorded is not proof of no existing token. The snapshot lacks parent relationships, fees, revenue, token supply, allocation and confirmed campaigns. Manual-review flags cover managed products and likely subsidiaries, but independent verification remains necessary for every row. House watchlist inclusion overrides screening to preserve required coverage. Category-based farm steps are suggested workflows, not audited protocol instructions; expected airdrop rewards are budgeted at zero. TVL can be double-counted and does not establish economic value. No live prices or claims about future issuance are used.

The immutable vendor dossier helper comes from the bounty kit. Source is MIT licensed. Screenshots are actual browser renders of this dashboard.