import { parseGa4GeographicSnapshot, parseGa4MarketOpportunitiesSnapshot } from "@/lib/ga4/dashboard";
import { getLatestGa4Snapshot } from "@/lib/ga4/snapshot";
import { GeographicInsights } from "../geographic-insights";

export default async function GeographicInsightsPage() {
  const { snapshot, error } = await getLatestGa4Snapshot(); const data = parseGa4GeographicSnapshot(snapshot); const marketData = parseGa4MarketOpportunitiesSnapshot(snapshot);
  return <>{error ? <div className="notice" role="status">Geographic reporting could not be refreshed. Please try again shortly.</div> : null}<GeographicInsights data={data} marketData={marketData}/></>;
}
