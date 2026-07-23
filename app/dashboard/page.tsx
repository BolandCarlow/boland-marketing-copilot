import Link from "next/link";
import { BarChart3, BrainCircuit, ChartNoAxesCombined, CircleDollarSign, ContactRound, Eye, MousePointerClick, UsersRound } from "lucide-react";
import { parseGa4Snapshot, type Ga4Snapshot } from "@/lib/ga4/dashboard";
import { createClient } from "@/lib/supabase/server";
import { ChartCard, DataTable, EmptyState, InsightCard, MetricCard, PageHeader, StatusBadge } from "./dashboard-ui";
import { WebsitePerformance } from "./website-performance";

type Kpi = { summary_date: string; total_leads: number };
type Spend = { platform: string; amount: number };
type MetaMetric = { spend: number; impressions: number; link_clicks: number; leads: number };
type Lead = { id: string; occurred_at: string; customer_name: string; status: string; salesperson: string | null; marketing_sources: unknown; lead_sources: unknown; brands: unknown; vehicle_models: unknown };

const currency = (value: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
const dateTime = (value: string) => new Date(value).toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" });
function relationName(value: unknown) { const relation = Array.isArray(value) ? value[0] : value; return relation && typeof relation === "object" && "name" in relation && typeof relation.name === "string" ? relation.name : "Unassigned"; }
function countBy(values: string[]) { const totals = new Map<string, number>(); values.forEach((value) => totals.set(value, (totals.get(value) ?? 0) + 1)); return [...totals.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value); }
function sumBy(rows: Spend[]) { const totals = new Map<string, number>(); rows.forEach((row) => totals.set(row.platform, (totals.get(row.platform) ?? 0) + Number(row.amount))); return [...totals.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value); }

function Bars({ rows, formatter = (value: number) => value.toLocaleString("en-IE") }: { rows: { label: string; value: number }[]; formatter?: (value: number) => string }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  if (!rows.length) return <EmptyState icon={BarChart3} title="No reporting data yet" description="Source and campaign breakdowns will appear once connected data is available."/>;
  return <div className="bar-list">{rows.slice(0, 6).map((row) => <div key={row.label}><div className="bar-top"><span>{row.label}</span><strong>{formatter(row.value)}</strong></div><div className="bar-track"><div className="bar-value" style={{ width: `${Math.max(5, (row.value / max) * 100)}%` }}/></div></div>)}</div>;
}

function TrendChart({ rows, days }: { rows: Kpi[]; days: 7 | 30 }) {
  const visible = rows.slice(-days); const values = visible.map((row) => Number(row.total_leads)); const max = Math.max(...values, 1);
  const points = values.map((value, index) => `${values.length === 1 ? 0 : (index / (values.length - 1)) * 100},${44 - (value / max) * 36}`).join(" ");
  const total = values.reduce((sum, value) => sum + value, 0);
  return <ChartCard title={`${days}-day lead trend`} description="Daily enquiry volume" icon={ContactRound} action={<strong>{total.toLocaleString("en-IE")}</strong>}>{visible.length ? <><div className="chart-canvas"><svg viewBox="0 0 100 48" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label={`${days}-day lead trend`}><path className="chart-fill" d={`M ${points} L 100,48 L 0,48 Z`}/><polyline className="chart-line" points={points} fill="none" strokeWidth="1.25" vectorEffect="non-scaling-stroke"/></svg></div><p className="small">{visible[0]?.summary_date ? new Date(`${visible[0].summary_date}T00:00:00`).toLocaleDateString("en-IE", { day: "numeric", month: "short" }) : "No data"} to today</p></> : <EmptyState icon={ContactRound} title="No lead trend yet" description="Daily lead activity will appear here when data is available."/>}</ChartCard>;
}

export default async function DashboardPage() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); thirtyDaysAgo.setHours(0, 0, 0, 0); const dateFloor = thirtyDaysAgo.toISOString().slice(0, 10);
  const [totalResult, leadsResult, kpisResult, spendResult, metaResult, insightsResult, ga4SnapshotResult] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id,occurred_at,customer_name,status,salesperson,marketing_sources(name),lead_sources(name),brands(name),vehicle_models(name)").gte("occurred_at", thirtyDaysAgo.toISOString()).order("occurred_at", { ascending: false }).limit(500),
    supabase.from("daily_kpi_summary").select("summary_date,total_leads").eq("scope", "all").gte("summary_date", dateFloor).order("summary_date", { ascending: true }).limit(30),
    supabase.from("marketing_spend").select("platform,amount").gte("spend_date", dateFloor).limit(500),
    supabase.from("meta_ads_metrics").select("spend,impressions,link_clicks,leads").gte("metric_date", dateFloor).limit(1000),
    supabase.from("marketing_insights").select("id,type,title,summary,recommendation").order("created_at", { ascending: false }).limit(3),
    user ? supabase.from("ga4_snapshots").select("generated_at,property_id,payload").eq("user_id", user.id).order("generated_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  const hasError = [totalResult, leadsResult, kpisResult, spendResult, metaResult, insightsResult, ga4SnapshotResult].some((result) => result.error);
  const leads = (leadsResult.data ?? []) as Lead[]; const kpis = (kpisResult.data ?? []) as Kpi[]; const spend = (spendResult.data ?? []) as Spend[]; const meta = (metaResult.data ?? []) as MetaMetric[];
  const metaSpend = meta.reduce((sum, row) => sum + Number(row.spend), 0); const metaImpressions = meta.reduce((sum, row) => sum + Number(row.impressions), 0); const metaLinkClicks = meta.reduce((sum, row) => sum + Number(row.link_clicks), 0); const metaLeads = meta.reduce((sum, row) => sum + Number(row.leads), 0);
  const ga4Data = parseGa4Snapshot(ga4SnapshotResult.data as Ga4Snapshot | null);
  const headerMeta = ga4Data ? <><StatusBadge status="live">GA4 synced</StatusBadge><span className="small">Last updated {dateTime(ga4Data.generatedAt)}</span></> : <StatusBadge status="pending">GA4 sync pending</StatusBadge>;
  return <>
    <PageHeader eyebrow="Executive dashboard" title="Boland Carlow Marketing Centre" description="A concise view of dealership demand, website performance and marketing investment." meta={headerMeta} actions={<Link className="button primary" href="/dashboard/settings/integrations">Manage sources</Link>}/>
    {hasError ? <div className="notice" role="status">Some reporting data could not be refreshed. Figures below may be incomplete.</div> : null}
    <section className="kpi-grid" aria-label="Marketing overview"><MetricCard icon={ContactRound} label="Total leads" value={Number(totalResult.count ?? 0).toLocaleString("en-IE")} detail="All sources, all time"/><MetricCard icon={CircleDollarSign} label="Meta Ads spend" value={currency(metaSpend)} detail="Last 30 days from Meta" tone="warning"/><MetricCard icon={Eye} label="Meta impressions" value={metaImpressions.toLocaleString("en-IE")} detail="Last 30 days from Meta"/><MetricCard icon={MousePointerClick} label="Meta leads" value={metaLeads.toLocaleString("en-IE")} detail={`${metaLinkClicks.toLocaleString("en-IE")} link clicks in the last 30 days`} tone="success"/></section>
    <WebsitePerformance data={ga4Data}/>
    <section className="section two-grid"><TrendChart rows={kpis} days={7}/><TrendChart rows={kpis} days={30}/></section>
    <section className="section four-grid"><ChartCard title="Leads by source" description="Last 30 days" icon={ContactRound}><Bars rows={countBy(leads.map((lead) => relationName(lead.lead_sources) ?? relationName(lead.marketing_sources)))}/></ChartCard><ChartCard title="Leads by brand" description="Where demand is concentrating" icon={ChartNoAxesCombined}><Bars rows={countBy(leads.map((lead) => relationName(lead.brands)))}/></ChartCard><ChartCard title="Leads by model" description="Top requested vehicles" icon={UsersRound}><Bars rows={countBy(leads.map((lead) => relationName(lead.vehicle_models)))}/></ChartCard><ChartCard title="Spend by platform" description="Last 30 days" icon={CircleDollarSign}><Bars rows={sumBy(spend)} formatter={currency}/></ChartCard></section>
    <section className="section two-grid"><ChartCard title="Recent enquiries" description="Latest customer interest" icon={ContactRound}>{leads.length ? <DataTable label="Recent enquiries"><thead><tr><th>Customer</th><th>Vehicle</th><th>Source</th><th>Owner</th><th>Status</th></tr></thead><tbody>{leads.slice(0, 8).map((lead) => <tr key={lead.id}><td>{lead.customer_name}<span className="small">{new Date(lead.occurred_at).toLocaleDateString("en-IE")}</span></td><td>{relationName(lead.brands)} · {relationName(lead.vehicle_models)}</td><td>{relationName(lead.marketing_sources)}</td><td>{lead.salesperson ?? "Unassigned"}</td><td><StatusBadge status="neutral">{lead.status}</StatusBadge></td></tr>)}</tbody></DataTable> : <EmptyState icon={ContactRound} title="No enquiries to review" description="Newly captured leads will be ready for your team here."/>}</ChartCard><ChartCard title="AI insights" description="Management-ready observations" icon={BrainCircuit}>{(insightsResult.data ?? []).length ? <div className="insight-stack">{(insightsResult.data ?? []).map((insight) => <InsightCard key={insight.id} icon={BrainCircuit} label={insight.type} title={insight.title} evidence={insight.summary} action={insight.recommendation ?? undefined}/>)}</div> : <EmptyState icon={BrainCircuit} title="No AI insight available" description="When enough connected activity is available, this area will surface useful marketing patterns."/>}</ChartCard></section>
  </>;
}
