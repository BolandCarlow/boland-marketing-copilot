import { parseGa4Snapshot } from "@/lib/ga4/dashboard";
import { getLatestGa4Snapshot } from "@/lib/ga4/snapshot";
import { Ga4KpiCards } from "../website-performance";

export default async function MarketIntelligenceOverviewPage() {
  const { snapshot, error } = await getLatestGa4Snapshot(); const data = parseGa4Snapshot(snapshot);
  return <><section className="section card section-card"><div className="section-heading"><div><h2 className="section-title">Website performance</h2><p className="section-description">Live GA4 website activity, with complete-month comparisons for the core performance measures.</p></div>{data ? <span className="pill">Property {data.propertyId}</span> : null}</div>{error ? <div className="notice" role="status">Live GA4 data could not be refreshed. You can try again shortly.</div> : null}<Ga4KpiCards data={data}/></section><section className="section two-grid"><article className="card section-card"><h2 className="section-title">What’s available today</h2><p className="section-description">Website analytics is live now. Geographic reporting will populate after the next GA4 refresh, while lead sources, vehicle performance and AI analysis are ready for their connected data sources.</p></article><article className="card section-card"><h2 className="section-title">Data readiness</h2><p className="section-description">Every view is scoped to the signed-in user’s connected data and gives a clear state when no source is connected yet.</p></article></section></>;
}
