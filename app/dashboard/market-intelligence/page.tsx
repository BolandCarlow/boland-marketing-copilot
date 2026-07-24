import { MapPinned, Radar } from "lucide-react";
import { parseGa4GeographicSnapshot, parseGa4Snapshot } from "@/lib/ga4/dashboard";
import { formatLocationName, isUnknownLocation } from "@/lib/ga4/location";
import { getLatestGa4Snapshot } from "@/lib/ga4/snapshot";
import { ChartCard, EmptyState, StatusBadge } from "../dashboard-ui";
import { Ga4KpiCards } from "../website-performance";

const number = (value: number) => value.toLocaleString("en-IE");

export default async function MarketIntelligenceOverviewPage() {
  const { snapshot, error } = await getLatestGa4Snapshot(); const data = parseGa4Snapshot(snapshot); const geography = parseGa4GeographicSnapshot(snapshot);
  const topLocations = [...(geography?.regions ?? [])].sort((a, b) => b.activeUsers - a.activeUsers).slice(0, 3);
  return <><section className="section"><div className="section-heading"><div><p className="eyebrow">Website demand</p><h2 className="section-title">Performance signals</h2><p className="section-description">Live GA4 website activity with complete-month comparisons for core performance measures.</p></div>{data ? <StatusBadge status="live">Property {data.propertyId}</StatusBadge> : null}</div>{error ? <div className="notice" role="status">Live GA4 data could not be refreshed. You can try again shortly.</div> : null}<Ga4KpiCards data={data}/></section><section className="section two-grid"><ChartCard title="Top website locations" description="Highest active-user counties in the latest GA4 snapshot" icon={MapPinned}>{topLocations.length ? <div className="location-summary">{topLocations.map((location) => <div key={location.label}>{isUnknownLocation(location.label) ? <span className="location-muted">{formatLocationName(location.label)}</span> : <strong>{formatLocationName(location.label)}</strong>}<span>{number(location.activeUsers)} active users</span></div>)}</div> : <EmptyState icon={MapPinned} title="Location data awaiting sync" description="Run a GA4 sync to populate Ireland website demand by county."/>}</ChartCard><ChartCard title="Data readiness" description="Available and upcoming reporting sources" icon={Radar}><div className="readiness-list"><div><StatusBadge status="live">Live</StatusBadge><span>Website performance and geographic website interest</span></div><div><StatusBadge status="pending">Pending</StatusBadge><span>Lead-source and vehicle data integrations</span></div><div><StatusBadge status="comingSoon">Planned</StatusBadge><span>Evidence-based AI analysis and exports</span></div></div></ChartCard></section></>;
}
