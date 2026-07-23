import type { Ga4DashboardData } from "@/lib/ga4/dashboard";

const number = (value: number | null) => value === null ? "—" : value.toLocaleString("en-IE");
const percent = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;
const dateTime = (value: string) => new Date(value).toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" });

function Change({ value }: { value: number | null }) { return <span className={value !== null && value < 0 ? "negative" : "positive"}>{value === null ? "No prior-month comparison" : `${value >= 0 ? "+" : ""}${percent(value)} last complete month`}</span>; }

function Empty({ children }: { children: string }) { return <div className="empty-state"><div><strong>No website data available</strong><p>{children}</p></div></div>; }

function SessionsTrend({ rows }: { rows: Ga4DashboardData["trend"] }) {
  if (!rows.length) return <article className="card section-card"><h3 className="section-title">Daily sessions</h3><Empty>Daily trend data will appear after the next complete GA4 refresh.</Empty></article>;
  const values = rows.map((row) => row.sessions); const max = Math.max(...values, 1); const points = values.map((value, index) => `${values.length === 1 ? 0 : index / (values.length - 1) * 100},${44 - value / max * 36}`).join(" ");
  return <article className="card section-card"><div className="section-heading"><div><h3 className="section-title">Daily sessions</h3><p className="section-description">Last 30 days</p></div><strong>{number(values.reduce((total, value) => total + value, 0))}</strong></div><div className="chart-canvas"><svg viewBox="0 0 100 48" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Daily sessions trend"><path className="chart-fill" d={`M ${points} L 100,48 L 0,48 Z`}/><polyline className="chart-line" points={points} fill="none" strokeWidth="1.25" vectorEffect="non-scaling-stroke"/></svg></div><p className="small">{rows[0]?.date} to {rows.at(-1)?.date}</p></article>;
}

function DeviceBreakdown({ rows }: { rows: Ga4DashboardData["devices"] }) {
  return <article className="card table-card"><div className="table-head"><h3 className="section-title">Device breakdown</h3><p className="section-description">Sessions and active users</p></div>{rows.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Device</th><th>Sessions</th><th>Users</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label}><td>{row.label}</td><td>{number(row.sessions)}</td><td>{number(row.activeUsers)}</td></tr>)}</tbody></table></div> : <Empty>Device data will appear after the next complete GA4 refresh.</Empty>}</article>;
}

export function WebsitePerformance({ data }: { data: Ga4DashboardData | null }) {
  if (!data) return <section className="section card section-card"><div className="section-heading"><div><p className="eyebrow">Website performance</p><h2 className="section-title">Google Analytics 4</h2><p className="section-description">Live website reporting will appear here after your first successful GA4 sync.</p></div></div><Empty>Connect Google Analytics and select Sync now to load live website performance.</Empty></section>;
  return <>
    <section className="section card section-card"><div className="section-heading"><div><p className="eyebrow">Website performance</p><h2 className="section-title">Google Analytics 4</h2><p className="section-description">Live 30-day website activity from property {data.propertyId}.</p></div><p className="small">Last updated<br/><strong>{dateTime(data.generatedAt)}</strong></p></div><div className="website-kpi-grid" aria-label="Website performance key performance indicators">{data.kpis.map((kpi) => <article className="card kpi" key={kpi.key}><p className="kpi-label">{kpi.label}</p><p className="kpi-value">{kpi.key === "engagementRate" ? percent(kpi.value) : number(kpi.value)}</p><p className="kpi-detail"><Change value={kpi.change}/></p></article>)}</div></section>
    <section className="section two-grid"><SessionsTrend rows={data.trend}/><DeviceBreakdown rows={data.devices}/></section>
    <section className="section two-grid"><article className="card table-card"><div className="table-head"><h3 className="section-title">Top acquisition channels</h3><p className="section-description">Sessions, users and key events in the last 30 days.</p></div>{data.channels.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Channel</th><th>Sessions</th><th>Users</th><th>Key events</th></tr></thead><tbody>{data.channels.map((row) => <tr key={row.label}><td>{row.label}</td><td>{number(row.sessions)}</td><td>{number(row.activeUsers)}</td><td>{number(row.keyEvents)}</td></tr>)}</tbody></table></div> : <Empty>Channel data will appear after the next complete GA4 refresh.</Empty>}</article><article className="card table-card"><div className="table-head"><h3 className="section-title">Top landing pages</h3><p className="section-description">Most visited entry pages in the last 30 days.</p></div>{data.landingPages.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Landing page</th><th>Sessions</th><th>Engaged</th><th>Key events</th></tr></thead><tbody>{data.landingPages.map((row) => <tr key={row.path}><td>{row.path}</td><td>{number(row.sessions)}</td><td>{number(row.engagedSessions)}</td><td>{number(row.keyEvents)}</td></tr>)}</tbody></table></div> : <Empty>Landing page data will appear after the next complete GA4 refresh.</Empty>}</article></section>
  </>;
}
