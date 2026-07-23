import { Activity, BarChart3, CalendarDays, CircleGauge, MousePointerClick, MonitorSmartphone, Route, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Ga4DashboardData } from "@/lib/ga4/dashboard";
import { ChartCard, DataTable, EmptyState, MetricCard, SectionHeader, StatusBadge } from "./dashboard-ui";

const number = (value: number | null) => value === null ? "—" : value.toLocaleString("en-IE");
const percent = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;
const dateTime = (value: string) => new Date(value).toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" });
const kpiIcons: Record<string, LucideIcon> = { activeUsers: UsersRound, sessions: Activity, newUsers: UsersRound, engagedSessions: CircleGauge, keyEvents: MousePointerClick, engagementRate: BarChart3 };

function SessionsTrend({ rows }: { rows: Ga4DashboardData["trend"] }) {
  if (!rows.length) return <ChartCard title="Traffic trends" description="Daily sessions"><EmptyState icon={CalendarDays} title="Daily trend awaiting data" description="A complete GA4 refresh will populate the daily traffic trend."/></ChartCard>;
  const values = rows.map((row) => row.sessions); const max = Math.max(...values, 1); const points = values.map((value, index) => `${values.length === 1 ? 0 : index / (values.length - 1) * 100},${44 - value / max * 36}`).join(" ");
  return <ChartCard title="Traffic trends" description="Daily sessions over the last 30 days" icon={Activity} action={<strong>{number(values.reduce((total, value) => total + value, 0))}</strong>}><div className="chart-canvas"><svg viewBox="0 0 100 48" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Daily sessions trend"><path className="chart-fill" d={`M ${points} L 100,48 L 0,48 Z`}/><polyline className="chart-line" points={points} fill="none" strokeWidth="1.25" vectorEffect="non-scaling-stroke"/></svg></div><p className="small">{rows[0]?.date} to {rows.at(-1)?.date}</p></ChartCard>;
}

export function Ga4KpiCards({ data }: { data: Ga4DashboardData | null }) {
  if (!data) return <EmptyState icon={BarChart3} title="No website data available" description="Connect Google Analytics and select Sync now to load live website performance."/>;
  return <div className="website-kpi-grid" aria-label="Website performance key performance indicators">{data.kpis.map((kpi) => <MetricCard key={kpi.key} icon={kpiIcons[kpi.key] ?? BarChart3} label={kpi.label} value={kpi.key === "engagementRate" ? percent(kpi.value) : number(kpi.value)} detail={kpi.key === "engagementRate" ? "Engaged sessions divided by sessions" : "Live GA4 website activity"} trend={kpi.change} tone={kpi.key === "keyEvents" ? "success" : "accent"}/>)}</div>;
}

export function WebsitePerformance({ data }: { data: Ga4DashboardData | null }) {
  if (!data) return <section className="section card section-card"><SectionHeader eyebrow="Website performance" title="Google Analytics 4" description="Live website reporting will appear here after your first successful GA4 sync."/><EmptyState icon={BarChart3} title="Connect Google Analytics" description="Connect your GA4 property and select Sync now to load live website performance."/></section>;
  return <>
    <section className="section"><SectionHeader eyebrow="Website performance" title="Your website at a glance" description={`Live 30-day activity from property ${data.propertyId}.`} action={<div><StatusBadge status="live">Live GA4</StatusBadge><p className="small">Updated {dateTime(data.generatedAt)}</p></div>}/><Ga4KpiCards data={data}/></section>
    <section className="section two-grid"><SessionsTrend rows={data.trend}/><ChartCard title="Devices" description="Sessions and active users" icon={MonitorSmartphone}>{data.devices.length ? <DataTable label="Device breakdown"><thead><tr><th>Device</th><th>Sessions</th><th>Users</th></tr></thead><tbody>{data.devices.map((row) => <tr key={row.label}><td>{row.label}</td><td>{number(row.sessions)}</td><td>{number(row.activeUsers)}</td></tr>)}</tbody></DataTable> : <EmptyState icon={MonitorSmartphone} title="No device data yet" description="Device activity will appear after the next complete GA4 refresh."/>}</ChartCard></section>
    <section className="section two-grid"><ChartCard title="Acquisition channels" description="Sessions, users and key events" icon={Route}>{data.channels.length ? <DataTable label="Top acquisition channels"><thead><tr><th>Channel</th><th>Sessions</th><th>Users</th><th>Key events</th></tr></thead><tbody>{data.channels.map((row) => <tr key={row.label}><td>{row.label}</td><td>{number(row.sessions)}</td><td>{number(row.activeUsers)}</td><td>{number(row.keyEvents)}</td></tr>)}</tbody></DataTable> : <EmptyState icon={Route} title="No channel data yet" description="Channel data will appear after the next complete GA4 refresh."/>}</ChartCard><ChartCard title="Landing pages" description="Most visited entry pages" icon={MousePointerClick}>{data.landingPages.length ? <DataTable label="Top landing pages"><thead><tr><th>Landing page</th><th>Sessions</th><th>Engaged</th><th>Key events</th></tr></thead><tbody>{data.landingPages.map((row) => <tr key={row.path}><td>{row.path}</td><td>{number(row.sessions)}</td><td>{number(row.engagedSessions)}</td><td>{number(row.keyEvents)}</td></tr>)}</tbody></DataTable> : <EmptyState icon={MousePointerClick} title="No landing-page data yet" description="Landing-page data will appear after the next complete GA4 refresh."/>}</ChartCard></section>
  </>;
}
