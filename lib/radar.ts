type Protocol = {slug:string;name:string;category:string|null;chains:string[];tvl_usd:number;change_7d:number|null;mcap_usd:number|null;gecko_id:string|null;symbol:string|null;listed_at:string|null};
type Snapshot = {as_of:string;source:string;floor_usd:number;protocols:Protocol[];watchlist:string[]};
const clamp = (x:number,a:number,b:number) => Math.max(a,Math.min(b,x));
const median = (a:number[]) => { const s=[...a].sort((a,b)=>a-b); return (s[Math.floor((s.length-1)/2)]+s[Math.ceil((s.length-1)/2)])/2; };
const excludedCategories=new Set(['CEX','Bridge','Canonical Bridge','Cross Chain Bridge','Liquid Staking','Liquid Restaking','Restaked BTC','Stablecoin Wrapper','Staking Pool']);
function exclusion(p:Protocol) {
  if(p.gecko_id||p.symbol||(p.mcap_usd||0)>0) return 'Token already recorded';
  if(excludedCategories.has(p.category||'')) return 'Exchange, bridge or staking derivative';
  if(/\b(wrapped|staked|staking)\b|\s(v\d+(\.\d+)?|\d+\.\d+)$/i.test(p.name)) return 'Wrapper, staking or versioned product';
  return null;
}
function plan(p:Protocol,review:boolean) {
  const c=p.category||'', chain=p.chains[0]||'the supported chain';
  const steps=[`Verify ${p.name}'s official domain, documentation and contract addresses independently. Confirm token status and eligibility: no token recorded in this snapshot does not prove a launch is pending.`,
    `Use a separate wallet on ${chain}; simulate approvals and fund a disposable test position. Planning limits: $25–$100 principal and $2–$20 gas, not measured fees. Stop if actual fees exceed your limit.`];
  if(review) steps.push(`Manual review: ${c} may describe a managed product or subsidiary; parent relationships are absent from this snapshot. Verify independent ownership and permissionless access before depositing; otherwise skip farming.`);
  if(/Lending|CDP|Collateral/.test(c)) steps.push(`If permissionless, supply a small liquid asset to ${p.name}. Avoid leverage; if a borrow test is needed, keep initial LTV below 20%, monitor health daily and repay before withdrawing. Liquidation and bad debt remain possible.`);
  else if(/Dex|Liquidity/.test(c)) steps.push(`On ${p.name}'s verified interface, test one small swap with a strict slippage limit. If providing liquidity, use a liquid pair you understand, record fees and impermanent loss, and test removing liquidity; avoid wash trading.`);
  else if(/Derivatives|Options|Prediction/.test(c)) steps.push(`Read ${p.name}'s settlement and margin rules. Prefer a testnet or one minimal fully collateralized position. Do not use leverage for points; confirm that closing and settlement work before any further usage.`);
  else if(/RWA|CeDeFi|Capital|Curator|Uncollateralized/.test(c)) steps.push(`Check ${p.name}'s access rules, custody, redemption queue and credit exposure. If KYC or minimum size excludes you, skip it. A vault deposit is credit exposure, not evidence its curator will issue a token.`);
  else steps.push(`Identify ${p.name}'s documented core user action on ${chain}. If accessible, test a small deposit or transaction and complete withdrawal. Do not interact with unidentified contracts or assume a points campaign exists.`);
  steps.push(`Review after 7 days: record transactions, gas, position value and exit liquidity. Continue only for useful activity within your loss budget. Points, allocation and token issuance are unconfirmed; budget expected rewards at zero.`);
  steps.push(`Exit by reversing the tested action, withdrawing assets and revoking unused approvals. Stop on unexpected approvals, paused withdrawals or changed custody terms. Check official announcements separately from this frozen snapshot.`);
  return steps;
}
export function analyze(s:Snapshot) {
  const watch=new Set(s.watchlist);
  const peers=s.protocols.filter(p=>(p.gecko_id||p.symbol)&&(p.mcap_usd||0)>0&&p.tvl_usd>0&&!excludedCategories.has(p.category||''))
    .filter(p=>p.mcap_usd!/p.tvl_usd>=0.01&&p.mcap_usd!/p.tvl_usd<=20);
  if(peers.length<3) throw Error('Insufficient market-cap / TVL comparables');
  const global=median(peers.map(p=>p.mcap_usd!/p.tvl_usd));
  const excluded=s.protocols.filter(p=>!watch.has(p.slug)&&exclusion(p)).map(p=>({slug:p.slug,name:p.name,category:p.category,reason:exclusion(p)}));
  const rows=s.protocols.filter(p=>watch.has(p.slug)||!exclusion(p)).map(p=>{
    const own=peers.filter(x=>x.category===p.category), w=own.length/(own.length+5);
    const multiple=clamp((own.length?median(own.map(x=>x.mcap_usd!/x.tvl_usd)):global)*w+global*(1-w),0.05,3);
    const age=p.listed_at?Math.max(0,Math.floor((Date.parse(s.as_of)-Date.parse(p.listed_at))/86400000)):null;
    const momentum=1+clamp(p.change_7d??0,-40,60)/100*0.25;
    const maturity=age===null?0.8:0.7+0.3*Math.min(age/730,1);
    const review=!watch.has(p.slug)&&(/Curator|Capital|RWA|CeDeFi|Yield|Restaking/.test(p.category||'')||/\b(v\d+|vault)\b/i.test(p.name));
    const haircut=review?0.65:1,value=Math.max(1,Math.round(p.tvl_usd*multiple*momentum*maturity*haircut));
    const uncertain=own.length<3||review||age===null||p.change_7d===null;
    const closest=[...(own.length?own:peers)].sort((a,b)=>Math.abs(Math.log(a.tvl_usd/p.tvl_usd))-Math.abs(Math.log(b.tvl_usd/p.tvl_usd))).slice(0,4);
    return {...p,rank:0,watchlist:watch.has(p.slug),status:review?'Review required':watch.has(p.slug)?'Watchlist':'Early discovery',
      confidence:uncertain?'Low':own.length>=8?'Moderate':'Limited',age_days:age,implied_value_usd:value,
      low_usd:Math.max(1,Math.round(value*(uncertain?0.35:0.55))),high_usd:Math.round(value*(uncertain?2.2:1.65)),
      multiple,momentum,maturity,haircut,peer_count:own.length,peer_weight:w,
      peers:closest.map(x=>({name:x.name,category:x.category,tvl_usd:x.tvl_usd,mcap_usd:x.mcap_usd,multiple:x.mcap_usd!/x.tvl_usd})),
      flags:[review?'Parent relationship and access need review':'No token recorded; verify independently',...(p.change_7d===null?['Growth unavailable; neutral assumption']:Math.abs(p.change_7d)>60?['Extreme growth clipped; TVL flows are not revenue']:[]),...(own.length<3?['Thin category sample; global fallback dominates']:[]),'Circulating-cap proxy; supply and FDV unavailable'],farm_steps:plan(p,review)};
  }).sort((a,b)=>b.implied_value_usd-a.implied_value_usd||a.slug.localeCompare(b.slug));
  rows.forEach((r,i)=>r.rank=i+1);
  if(rows.length<100||s.watchlist.some(x=>!rows.some(r=>r.slug===x))) throw Error('Coverage requirement not met');
  return {name:'Launch Atlas',version:'atlas-1',as_of:s.as_of,source:s.source,floor_usd:s.floor_usd,universe_count:s.protocols.length,watchlist_count:s.watchlist.length,peer_count:peers.length,global_median:global,rows,excluded,
    method:'Circulating-cap proxy = TVL × shrunk category median market-cap/TVL × bounded momentum × maturity × review haircut. Category weight n/(n+5); global median fills the remainder. Peer ratios outside 0.01–20 excluded; blended multiple clipped to 0.05–3. Momentum = 1 + clamp(7d growth,-40,60)/100 × 0.25. Maturity = 0.7 + 0.3 × min(age/730,1); unknown age 0.8. Review haircut 0.65, otherwise 1. Scenario bands are subjective stress ranges, not confidence intervals or FDV. Launch probability and allocation cannot be inferred.'};
}