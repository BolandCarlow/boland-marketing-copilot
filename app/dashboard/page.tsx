import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Kpi = { summary_date: string; total_leads: number };
type Spend = { platform: string; amount: number };
type Lead = { id: string; occurred_at: string; customer_name: string; status: string; salesperson: string | null; marketing_sources: unknown; lead_sources: unknown; brands: unknown; vehicle_models: unknown };

const currency = (value: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
function relationName(value: unknown) { const relation = Array.isArray(value) ? value[0] : value; return relation && typeof relation === "object" && "name" in relation && typeof relation.name === "string" ? relation.name : "Unassigned"; }
function countBy(values: string[]) { const totals = new Map<string, number>(); values.forEach((value) => totals.set(value, (totals.get(value) ?? 0) + 1)); return [...totals.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value); }
function sumBy(rows: Spend[]) { const totals = new Map<string, number>(); rows.forEach((row) => totals.set(row.platform, (totals.get(row.platform) ?? 0) + Number(row.amount))); return [...totals.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value); }

function Bars({ rows, formatter = (value: number) => value.toLocaleString("en-IE") }: { rows: { label: string; value: number }[]; formatter?: (value: number) => string }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  if (!rows.length) return <div className="empty-state"><div><strong>No reporting data yet</strong><p>Your source and campaign breakdowns will appear here once data is available.</p></div></div>;
  return <div className="bar-list">{rows.slice(0, 6).map((row) => <div key={row.label}><div className="bar-top"><span>{row.label}</span><strong>{formatter(row.value)}</strong></div><div className="bar-track"><div className="bar-value" style={{ width: `${Math.max(5, (row.value / max) * 100)}%` }}/></div></div>)}</div>;
}

function TrendChart({ rows, days }: { rows: Kpi[]; days: 7 | 30 }) {
  const visible = rows.slice(-days); const values = visible.map((row) => Number(row.total_leads)); const max = Math.max(...values, 1);
  const points = values.map((value, index) => `${values.length === 1 ? 0 : (index / (values.length - 1)) * 100},${44 - (value / max) * 36}`).join(" ");
  const total = values.reduce((sum, value) => sum + value, 0);
  return <div className="chart"><div className="section-heading"><div><p className="chart-label">{days}-day lead trend</p><p className="chart-total">{total.toLocaleString("en-IE")} leads</p></div><span className="small">{visible[0]?.summary_date ? new Date(`${visible[0].summary_date}T00:00:00`).toLocaleDateString("en-IE", { day: "numeric", month: "short" }) : "No data"}</span></div><div className="chart-canvas">{visible.length ? <svg viewBox="0 0 100 48" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label={`${days}-day lead trend`}><path className="chart-fill" d={`M ${points} L 100,48 L 0,48 Z`}/><polyline className="chart-line" points={points} fill="none" strokeWidth="1.25" vectorEffect="non-scaling-stroke"/></svg> : <div className="empty-state">No trend data</div>}</div></div>;
}

export default async function DashboardPage() {
  const supabase = await createClient(); const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); thirtyDaysAgo.setHours(0, 0, 0, 0); const dateFloor = thirtyDaysAgo.toISOString().slice(0, 10);
  const [totalResult, leadsResult, kpisResult, spendResult, insightsResult] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id,occurred_at,customer_name,status,salesperson,marketing_sources(name),lead_sources(name),brands(name),vehicle_models(name)").gte("occurred_at", thirtyDaysAgo.toISOString()).order("occurred_at", { ascending: false }).limit(500),
    supabase.from("daily_kpi_summary").select("summary_date,total_leads").eq("scope", "all").gte("summary_date", dateFloor).order("summary_date", { ascending: true }).limit(30),
    supabase.from("marketing_spend").select("platform,amount").gte("spend_date", dateFloor).limit(500),
    supabase.from("marketing_insights").select("id,type,title,summary,recommendation").order("created_at", { ascending: false }).limit(3)
  ]);
  const hasError = [totalResult, leadsResult, kpisResult, spendResult, insightsResult].some((result) => result.error);
  const leads = (leadsResult.data ?? []) as Lead[]; const kpis = (kpisResult.data ?? []) as Kpi[]; const spend = (spendResult.data ?? []) as Spend[];
  const spendTotal = spend.reduce((sum, row) => sum + Number(row.amount), 0); const thirtyDayLeads = kpis.reduce((sum, row) => sum + Number(row.total_leads), 0); const sevenDayLeads = kpis.slice(-7).reduce((sum, row) => sum + Number(row.total_leads), 0);
  const cards = [["Total leads", Number(totalResult.count ?? 0).toLocaleString("en-IE"), "All sources, all time"], ["Leads this month", thirtyDayLeads.toLocaleString("en-IE"), `${sevenDayLeads} in the last 7 days`], ["Marketing spend", currency(spendTotal), "Google Ads and Meta Ads"], ["Cost per lead", currency(thirtyDayLeads ? spendTotal / thirtyDayLeads : 0), "30-day blended CPL"]];
  return <>
    <header className="page-header"><div><p className="eyebrow">Overview</p><h1 className="page-title">Marketing performance, at a glance.</h1><p className="page-intro">A focused view of dealership demand, marketing investment and the actions that need attention.</p></div><Link className="button" href="/dashboard/settings/integrations">Manage sources</Link></header>
    {hasError ? <div className="notice" role="status">Some reporting data could not be refreshed. Figures below may be incomplete.</div> : null}
    <section className="kpi-grid" aria-label="Key performance indicators">{cards.map(([label, value, detail]) => <article className="card kpi" key={label}><p className="kpi-label">{label}</p><p className="kpi-value">{value}</p><p className="kpi-detail">{detail}</p></article>)}</section>
    <section className="section card section-card"><div className="section-heading"><div><h2 className="section-title">Lead momentum</h2><p className="section-description">Daily enquiry volume across short and medium-term windows.</p></div></div><div className="chart-grid"><TrendChart rows={kpis} days={7}/><TrendChart rows={kpis} days={30}/></div></section>
    <section className="section four-grid"><article className="card section-card"><h2 className="section-title">Leads by source</h2><p className="section-description">Last 30 days</p><Bars rows={countBy(leads.map((lead) => relationName(lead.lead_sources) ?? relationName(lead.marketing_sources)))}/></article><article className="card section-card"><h2 className="section-title">Leads by brand</h2><p className="section-description">Where demand is concentrating</p><Bars rows={countBy(leads.map((lead) => relationName(lead.brands)))}/></article><article className="card section-card"><h2 className="section-title">Leads by model</h2><p className="section-description">Top requested vehicles</p><Bars rows={countBy(leads.map((lead) => relationName(lead.vehicle_models)))}/></article><article className="card section-card"><h2 className="section-title">Spend by platform</h2><p className="section-description">Last 30 days</p><Bars rows={sumBy(spend)} formatter={currency}/></article></section>
    <section className="section two-grid"><div className="card table-card"><div className="table-head"><h2 className="section-title">Recent enquiries</h2><p className="section-description">The latest customer interest in one practical view.</p></div>{leads.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Customer</th><th>Vehicle</th><th>Source</th><th>Owner</th><th>Status</th></tr></thead><tbody>{leads.slice(0, 8).map((lead) => <tr key={lead.id}><td>{lead.customer_name}<span className="small">{new Date(lead.occurred_at).toLocaleDateString("en-IE")}</span></td><td>{relationName(lead.brands)} · {relationName(lead.vehicle_models)}</td><td>{relationName(lead.marketing_sources)}</td><td>{lead.salesperson ?? "Unassigned"}</td><td><span className="badge">{lead.status}</span></td></tr>)}</tbody></table></div> : <div className="empty-state"><div><strong>No enquiries to review</strong><p>Newly captured leads will be ready for your team here.</p></div></div>}</div><aside className="card table-card"><div className="table-head"><h2 className="section-title">AI insights</h2><p className="section-description">Management-ready observations from your marketing data.</p></div>{(insightsResult.data ?? []).length ? (insightsResult.data ?? []).map((insight) => <article className="insight" key={insight.id}><span className="insight-type">{insight.type}</span><h4>{insight.title}</h4><p>{insight.summary}</p>{insight.recommendation ? <p><strong>Next:</strong> {insight.recommendation}</p> : null}</article>) : <div className="empty-state"><div><strong>Insights will appear here</strong><p>When enough activity is available, this area will surface useful marketing patterns.</p></div></div>}</aside></section>
  </>;
}
