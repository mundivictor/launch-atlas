import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { analyze } from './radar.ts';

// Pass the original sealed snapshot; tests never modify that input on disk.
const input = process.argv[2];
if (!input) throw new Error('Usage: node lib/radar.test.ts <snapshot.json>');
const snapshot = JSON.parse(readFileSync(input, 'utf8'));
const result = analyze(snapshot);
const again = analyze(snapshot);
assert.deepEqual(result, again, 'identical input must produce identical output');
assert(result.rows.length >= 100, 'minimum board size');
assert.equal(result.watchlist_count, snapshot.watchlist.length);
const universe = new Set(snapshot.protocols.map(p => p.slug));
const slugs = new Set(result.rows.map(r => r.slug));
assert.equal(slugs.size, result.rows.length, 'unique protocols');
for (const slug of snapshot.watchlist) {
  assert(slugs.has(slug), `watchlist coverage: ${slug}`);
}
for (const [i, row] of result.rows.entries()) {
  assert(universe.has(row.slug), 'no invented protocol');
  assert.equal(row.rank, i + 1, 'contiguous ranks');
  assert(Number.isSafeInteger(row.implied_value_usd));
  assert(row.implied_value_usd > 0);
  assert(row.implied_value_usd <= 100_000_000_000_000);
  if (i > 0) {
    assert(result.rows[i - 1].implied_value_usd >= row.implied_value_usd);
  }
  assert(row.low_usd <= row.implied_value_usd);
  assert(row.high_usd >= row.implied_value_usd);
  assert(row.multiple >= 0.05 && row.multiple <= 3);
  assert(row.momentum >= 0.9 && row.momentum <= 1.15);
  assert(row.maturity >= 0.7 && row.maturity <= 1);
  assert.equal(row.implied_value_usd, Math.max(1, Math.round(
    row.tvl_usd * row.multiple * row.momentum * row.maturity * row.haircut
  )), 'published valuation bridge reproduces exact base');
  assert(row.farm_steps.length >= 3 && row.farm_steps.length <= 12);
  for (const step of row.farm_steps) {
    assert(step.trim().length >= 20 && step.trim().length <= 600);
  }
  if (!row.watchlist) {
    assert(!row.symbol && !row.gecko_id, 'recorded tokens excluded');
    assert(!['CEX', 'Bridge', 'Liquid Staking'].includes(row.category || ''));
  }
  assert(row.peers.length > 0 && row.peers.length <= 4);
  for (const peer of row.peers) {
    assert(peer.mcap_usd! > 0 && peer.tvl_usd > 0);
    assert.equal(peer.multiple, peer.mcap_usd! / peer.tvl_usd);
  }
  if (row.status === 'Review required') {
    assert.equal(row.haircut, 0.65);
    assert.equal(row.confidence, 'Low');
    assert(row.farm_steps.some(s => s.startsWith('Manual review:')));
  }
}
for (const row of result.excluded) {
  assert(!slugs.has(row.slug), 'excluded records never enter the board');
}
assert(new Set(result.rows.map(r => r.implied_value_usd)).size > 1);
const missingGrowth = structuredClone(snapshot);
missingGrowth.protocols.forEach(p => { p.change_7d = null; });
const neutral = analyze(missingGrowth);
assert(neutral.rows.every(r => r.momentum === 1));
assert(neutral.rows.every(r => r.flags.some(f => f.includes('Growth unavailable'))));
console.log(`PASS: ${result.rows.length} rows; coverage, ranks, values, peers, plans, exclusions, deterministic output and missing-growth behavior`);