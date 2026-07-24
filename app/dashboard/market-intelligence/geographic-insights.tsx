"use client";

import { useMemo, useState } from "react";
import { Building2, MapPinned, Sparkles } from "lucide-react";
import type { Ga4GeographicData, Ga4GeographicRow, Ga4MarketOpportunitiesData } from "@/lib/ga4/dashboard";
import { ga4DisplayText } from "@/lib/ga4/display";
import { visibleTableRows } from "@/lib/ga4/table-display";
import { ChartCard, DataTable, EmptyState, InsightCard, SectionHeader, StatusBadge } from "../dashboard-ui";
import { MarketOpportunities } from "./market-opportunities";

type MapMetric = "activeUsers" | "sessions" | "engagedSessions" | "keyEvents";
type SortKey = "label" | "activeUsers" | "sessions" | "keyEvents" | "engagement";

const metrics: { key: MapMetric; label: string }[] = [
  { key: "activeUsers", label: "Active Users" }, { key: "sessions", label: "Sessions" },
  { key: "engagedSessions", label: "Engaged Sessions" }, { key: "keyEvents", label: "Key Events" },
];
const counties = [
  { name: "Donegal", col: 3, row: 1 }, { name: "Sligo", col: 2, row: 2 }, { name: "Leitrim", col: 3, row: 2 }, { name: "Cavan", col: 4, row: 2 }, { name: "Monaghan", col: 5, row: 2 }, { name: "Mayo", col: 1, row: 3 }, { name: "Longford", col: 3, row: 3 }, { name: "Roscommon", col: 3, row: 4 }, { name: "Meath", col: 5, row: 3 }, { name: "Louth", col: 6, row: 3 }, { name: "Galway", col: 2, row: 4 }, { name: "Westmeath", col: 4, row: 4 }, { name: "Dublin", col: 6, row: 4 }, { name: "Offaly", col: 4, row: 5 }, { name: "Kildare", col: 5, row: 5 }, { name: "Wicklow", col: 6, row: 5 }, { name: "Clare", col: 2, row: 6 }, { name: "Laois", col: 4, row: 6 }, { name: "Carlow", col: 5, row: 6 }, { name: "Limerick", col: 2, row: 7 }, { name: "Tipperary", col: 3, row: 7 }, { name: "Kilkenny", col: 5, row: 7 }, { name: "Wexford", col: 6, row: 7 }, { name: "Kerry", col: 1, row: 8 }, { name: "Cork", col: 2, row: 8 }, { name: "Waterford", col: 5, row: 8 },
];

const safeNumber = (value: unknown) => Number.isFinite(value) ? Number(value) : 0;
const number = (value: unknown) => safeNumber(value).toLocaleString("en-IE");
const percent = (value: number | null | undefined) => value === null || value === undefined || !Number.isFinite(value) ? "—" : `${(value * 100).toFixed(1)}%`;
const text = (value: unknown, fallback = "Unknown") => ga4DisplayText(value, fallback);
const ireland = (row: Ga4GeographicRow) => ["ireland", "republic of ireland", "éire"].includes(text(row.country, "").toLowerCase());
const countyKey = (value: string) => value.toLowerCase().replace(/^county\s+/, "").replace(/\s+county$/, "").trim();
const engagement = (row: Ga4GeographicRow) => safeNumber(row.sessions) > 0 ? safeNumber(row.engagedSessions) / safeNumber(row.sessions) : null;

function TableFooter({ shown, total, noun, expanded, onToggle }: { shown: number; total: number; noun: string; expanded: boolean; onToggle: () => void }) {
  if (total <= 5) return null;
  return <div className="table-list-footer"><span>Showing {shown} of {total} {noun}</span><button type="button" className="button" onClick={onToggle}>{expanded ? `Show fewer ${noun}` : `View all ${noun}`}</button></div>;
}

export function GeographicInsights({ data, marketData }: { data: Ga4GeographicData | null; marketData: Ga4MarketOpportunitiesData | null }) {
  const [metric, setMetric] = useState<MapMetric>("activeUsers");
  const [sort, setSort] = useState<SortKey>("activeUsers");
  const [descending, setDescending] = useState(true);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [allCounties, setAllCounties] = useState(false);
  const [allCities, setAllCities] = useState(false);

  const regions = useMemo(() => (data?.regions ?? []).filter(ireland), [data]);
  const cities = useMemo(() => (data?.cities ?? []).filter(ireland), [data]);
  const countyData = useMemo(() => new Map(regions.map((row) => [countyKey(text(row.label, "")), row])), [regions]);
  const mapMax = Math.max(...counties.map((county) => safeNumber(countyData.get(county.name.toLowerCase())?.[metric])), 1);
  const sortedRegions = useMemo(() => [...regions].sort((left, right) => {
    const leftValue = sort === "label" ? text(left.label) : sort === "engagement" ? engagement(left) ?? -1 : safeNumber(left[sort]);
    const rightValue = sort === "label" ? text(right.label) : sort === "engagement" ? engagement(right) ?? -1 : safeNumber(right[sort]);
    const comparison = typeof leftValue === "string" ? leftValue.localeCompare(String(rightValue)) : Number(leftValue) - Number(rightValue);
    return descending ? -comparison : comparison;
  }), [descending, regions, sort]);
  const sortedCities = useMemo(() => [...cities].sort((left, right) => safeNumber(right.activeUsers) - safeNumber(left.activeUsers)), [cities]);
  const visibleRegions = visibleTableRows(sortedRegions, allCounties);
  const visibleCities = visibleTableRows(sortedCities, allCities);
  const insights = useMemo(() => {
    const result: string[] = [];
    const highestTraffic = [...regions].sort((a, b) => safeNumber(b.activeUsers) - safeNumber(a.activeUsers))[0];
    const highestEngagement = [...regions].filter((row) => safeNumber(row.sessions) > 0).sort((a, b) => (engagement(b) ?? 0) - (engagement(a) ?? 0))[0];
    const largestCity = [...cities].sort((a, b) => safeNumber(b.activeUsers) - safeNumber(a.activeUsers))[0];
    if (highestTraffic) result.push(`${text(highestTraffic.label)} has the highest website traffic with ${number(highestTraffic.activeUsers)} active users.`);
    if (highestEngagement) result.push(`${text(highestEngagement.label)} has the highest engagement rate at ${percent(engagement(highestEngagement))}.`);
    if (largestCity) result.push(`${text(largestCity.label)} is the largest city audience with ${number(largestCity.activeUsers)} active users.`);
    return result;
  }, [cities, regions]);
  const setSortKey = (key: SortKey) => { if (sort === key) setDescending(!descending); else { setSort(key); setDescending(key !== "label"); } };

  if (!data) return <><section className="section"><ChartCard title="Geographic insights" description="Ireland location reporting will appear after a GA4 refresh that includes geographic data." icon={MapPinned}><EmptyState icon={MapPinned} title="Geographic data awaiting sync" description="Run Sync now from Google Analytics after the geographic refresh update is deployed."/></ChartCard></section><MarketOpportunities data={marketData} selectedCounty={selectedCounty} onSelectCounty={setSelectedCounty}/></>;

  return <>
    <section className="section"><SectionHeader eyebrow="Geographic insights" title="Ireland website demand" description="Aggregated website activity by county, based on live GA4 region data." action={<StatusBadge status="live">Property {text(data.propertyId, "—")}</StatusBadge>}/><ChartCard title="Ireland demand map" description="Select a county to review its location and page-view interest." icon={MapPinned}><div className="metric-switch" role="group" aria-label="Heat map metric">{metrics.map((item) => <button type="button" key={item.key} className={metric === item.key ? "button primary" : "button"} onClick={() => setMetric(item.key)}>{item.label}</button>)}</div>{regions.length ? <div className="county-map" aria-label={`Ireland county heat map showing ${metrics.find((item) => item.key === metric)?.label}`} >{counties.map((county) => { const value = safeNumber(countyData.get(county.name.toLowerCase())?.[metric]); const intensity = value / mapMax; const selected = countyKey(selectedCounty ?? "") === county.name.toLowerCase(); return <button type="button" key={county.name} className={`county-cell${selected ? " selected" : ""}`} onClick={() => setSelectedCounty(county.name)} style={{ gridColumn: county.col, gridRow: county.row, backgroundColor: value ? `rgba(29, 95, 77, ${0.18 + intensity * 0.72})` : "var(--surface-muted)", outline: selected ? "2px solid var(--accent)" : undefined, outlineOffset: selected ? "2px" : undefined }} title={`${county.name}: ${number(value)}`}><span>{county.name}</span><strong>{number(value)}</strong></button>; })}</div> : <EmptyState icon={MapPinned} title="No Ireland regional data" description="No Ireland regional data was returned by the latest GA4 snapshot."/>}</ChartCard></section>
    <section className="section two-grid"><ChartCard title="County leaderboard" description="Sort live regional traffic and engagement for Ireland." icon={Building2}>{regions.length ? <><DataTable label="County leaderboard"><thead><tr><th><button type="button" onClick={() => setSortKey("label")}>County</button></th><th><button type="button" onClick={() => setSortKey("activeUsers")}>Users</button></th><th><button type="button" onClick={() => setSortKey("sessions")}>Sessions</button></th><th><button type="button" onClick={() => setSortKey("keyEvents")}>Key events</button></th><th><button type="button" onClick={() => setSortKey("engagement")}>Engagement rate</button></th></tr></thead><tbody>{visibleRegions.map((row) => <tr key={`${row.country}-${row.label}`} tabIndex={0} onClick={() => setSelectedCounty(text(row.label, "Unknown"))} onKeyDown={(event) => event.key === "Enter" && setSelectedCounty(text(row.label, "Unknown"))}><td>{text(row.label)}</td><td>{number(row.activeUsers)}</td><td>{number(row.sessions)}</td><td>{number(row.keyEvents)}</td><td>{percent(engagement(row))}</td></tr>)}</tbody></DataTable><TableFooter shown={visibleRegions.length} total={sortedRegions.length} noun="counties" expanded={allCounties} onToggle={() => setAllCounties(!allCounties)}/></> : <EmptyState icon={Building2} title="County results awaiting sync" description="County results will appear after a geographic GA4 refresh."/>}</ChartCard><ChartCard title="Automatic insights" description="Observations supported by the current GA4 location data." icon={Sparkles}>{insights.length ? <div className="insight-stack">{insights.map((insight) => <InsightCard key={insight} icon={Sparkles} label="Location signal" title="Live location observation" evidence={insight}/>)}</div> : <EmptyState icon={Sparkles} title="No insight available" description="Insights will appear when the snapshot contains Ireland regional or city data."/>}</ChartCard></section>
    <section className="section"><ChartCard title="Top cities" description="Live GA4 city audience in Ireland." icon={Building2}>{cities.length ? <><DataTable label="Top cities"><thead><tr><th>City</th><th>Users</th><th>Sessions</th><th>Key events</th></tr></thead><tbody>{visibleCities.map((row) => <tr key={`${row.country}-${row.label}`}><td>{text(row.label, "Unknown")}</td><td>{number(row.activeUsers)}</td><td>{number(row.sessions)}</td><td>{number(row.keyEvents)}</td></tr>)}</tbody></DataTable><TableFooter shown={visibleCities.length} total={sortedCities.length} noun="cities" expanded={allCities} onToggle={() => setAllCities(!allCities)}/></> : <EmptyState icon={Building2} title="City data awaiting sync" description="City data will appear after a geographic GA4 refresh."/>}</ChartCard></section>
    <MarketOpportunities data={marketData} selectedCounty={selectedCounty} onSelectCounty={setSelectedCounty}/>
  </>;
}
