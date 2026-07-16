import Link from "next/link";
import { providers } from "@/lib/data-platform/providers";
import { createClient } from "@/lib/supabase/server";

type Kpi = { summary_date: string; total_leads: number };
type Spend = { platform: string; amount: number };
type Lead = {
  id: string;
  occurred_at: string;
  customer_name: string;
  status: string;
  salesperson: string | null;
  marketing_sources: unknown;
  brands: unknown;
  vehicle_models: unknown;
};

function currency(value: number) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function relationName(value: unknown) {
  const relation = Array.isArray(value) ? value[0] : value;
  if (relation && typeof relation === "object" && "name" in relation && typeof relation.name === "string") return relation.name;
  return "Unassigned";
}

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function sumBy(rows: Spend[]) {
  const totals = new Map<string, number>();
  rows.forEach((row) => totals.set(row.platform, (totals.get(row.platform) ?? 0) + Number(row.amount)));
  return [...totals.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function BreakdownBars({ rows, valueFormatter = (value) => value.toLocaleString("en-IE") }: {
  rows: { label: string; value: number }[];
  valueFormatter?: (value: number) => string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return <div className="mt-5 space-y-4">{rows.length ? rows.map((row) => <div key={row.label}>
    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="truncate text-slate-300">{row.label}</span><span className="font-semibold text-slate-100">{valueFormatter(row.value)}</span></div>
    <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300" style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} /></div>
  </div>) : <p className="py-8 text-center text-sm text-slate-500">Apply the seed migration to populate this view.</p>}</div>;
}

function TrendChart({ rows, days }: { rows: Kpi[]; days: 7 | 30 }) {
  const visible = rows.slice(-days);
  const values = visible.map((row) => Number(row.total_leads));
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
    const y = 44 - (value / max) * 38;
    return `${x},${y}`;
  }).join(" ");
  const total = values.reduce((sum, value) => sum + value, 0);

  return <article className="rounded-xl border border-slate-800 bg-slate-950 p-4">
    <div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{days}-day trend</p><p className="mt-1 text-2xl font-bold">{total} leads</p></div><p className="text-xs text-slate-500">{visible[0]?.summary_date ? new Date(`${visible[0].summary_date}T00:00:00`).toLocaleDateString("en-IE", { day: "numeric", month: "short" }) : "No data"}</p></div>
    <div className="mt-4 h-28">{visible.length ? <svg viewBox="0 0 100 48" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label={`${days}-day lead trend`}>
      <defs><linearGradient id={`lead-fill-${days}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22d3ee" stopOpacity="0.3"/><stop offset="1" stopColor="#22d3ee" stopOpacity="0"/></linearGradient></defs>
      <path d={`M ${points} L 100,48 L 0,48 Z`} fill={`url(#lead-fill-${days})`} />
      <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg> : <div className="grid h-full place-items-center text-xs text-slate-500">No trend data</div>}</div>
  </article>;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  const dateFloor = thirtyDaysAgo.toISOString().slice(0, 10);

  const [totalResult, leadsResult, kpisResult, spendResult, insightsResult, settingsResult] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id,occurred_at,customer_name,status,salesperson,marketing_sources(name),brands(name),vehicle_models(name)").gte("occurred_at", thirtyDaysAgo.toISOString()).order("occurred_at", { ascending: false }).limit(500),
    supabase.from("daily_kpi_summary").select("summary_date,total_leads").eq("scope", "all").gte("summary_date", dateFloor).order("summary_date", { ascending: true }).limit(30),
    supabase.from("marketing_spend").select("platform,amount").gte("spend_date", dateFloor).limit(500),
    supabase.from("marketing_insights").select("id,type,title,summary,recommendation").order("created_at", { ascending: false }).limit(3),
    supabase.from("integration_settings").select("provider,account_identifier")
  ]);

  const leads = (leadsResult.data ?? []) as Lead[];
  const kpis = (kpisResult.data ?? []) as Kpi[];
  const spend = (spendResult.data ?? []) as Spend[];
  const spendTotal = spend.reduce((sum, row) => sum + Number(row.amount), 0);
  const thirtyDayLeads = kpis.reduce((sum, row) => sum + Number(row.total_leads), 0);
  const sevenDayLeads = kpis.slice(-7).reduce((sum, row) => sum + Number(row.total_leads), 0);
  const costPerLead = thirtyDayLeads ? spendTotal / thirtyDayLeads : 0;
  const sourceRows = countBy(leads.map((lead) => relationName(lead.marketing_sources)));
  const brandRows = countBy(leads.map((lead) => relationName(lead.brands)));
  const modelRows = countBy(leads.map((lead) => relationName(lead.vehicle_models))).slice(0, 6);
  const spendRows = sumBy(spend);
  const configuredProviders = new Set((settingsResult.data ?? []).filter((setting) => setting.account_identifier).map((setting) => setting.provider));

  const cards = [
    ["Total leads", Number(totalResult.count ?? 0).toLocaleString("en-IE"), "All sources, all time"],
    ["Leads in 30 days", thirtyDayLeads.toLocaleString("en-IE"), `${sevenDayLeads} in the last 7 days`],
    ["Marketing spend", currency(spendTotal), "Google Ads and Meta Ads"],
    ["Cost per lead", currency(costPerLead), "30-day blended CPL"]
  ];

  return <>
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-sm font-medium text-cyan-300">Lead intelligence</p><h2 className="mt-1 text-3xl font-bold">Dealership lead dashboard</h2><p className="mt-2 max-w-2xl text-slate-400">A central view of enquiries, campaign investment and sales demand across every Boland marketing source.</p></div>
      <Link href="/dashboard/settings/integrations" className="w-fit rounded-lg border border-cyan-400/50 px-4 py-2 text-sm font-semibold text-cyan-300">Configure sources</Link>
    </header>

    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, helper]) => <article key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-4 text-3xl font-bold">{value}</p><p className="mt-2 text-xs text-slate-500">{helper}</p></article>)}</section>

    <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
      <div><h3 className="text-lg font-semibold">Lead momentum</h3><p className="mt-1 text-sm text-slate-400">Daily enquiry volume, shown across short- and medium-term windows.</p></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2"><TrendChart rows={kpis} days={7} /><TrendChart rows={kpis} days={30} /></div>
    </section>

    <section className="mt-6 grid gap-6 lg:grid-cols-2 2xl:grid-cols-4">
      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h3 className="font-semibold">Leads by source</h3><p className="mt-1 text-sm text-slate-500">Last 30 days</p><BreakdownBars rows={sourceRows} /></article>
      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h3 className="font-semibold">Leads by brand</h3><p className="mt-1 text-sm text-slate-500">Škoda, Volvo, Peugeot and Mazda</p><BreakdownBars rows={brandRows} /></article>
      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h3 className="font-semibold">Leads by model</h3><p className="mt-1 text-sm text-slate-500">Top requested vehicles</p><BreakdownBars rows={modelRows} /></article>
      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h3 className="font-semibold">Spend by platform</h3><p className="mt-1 text-sm text-slate-500">Last 30 days</p><BreakdownBars rows={spendRows} valueFormatter={currency} /></article>
    </section>

    <div className="mt-6 grid gap-6 xl:grid-cols-5">
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 xl:col-span-3">
        <div className="border-b border-slate-800 p-5"><h3 className="text-lg font-semibold">Recent enquiries</h3><p className="mt-1 text-sm text-slate-400">The newest leads waiting in the central database.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-sm"><thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Vehicle</th><th className="px-5 py-3">Source</th><th className="px-5 py-3">Owner</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-800">{leads.slice(0, 8).map((lead) => <tr key={lead.id}><td className="px-5 py-4 font-medium">{lead.customer_name}<span className="mt-1 block text-xs font-normal text-slate-500">{new Date(lead.occurred_at).toLocaleDateString("en-IE")}</span></td><td className="px-5 py-4 text-slate-300">{relationName(lead.brands)} · {relationName(lead.vehicle_models)}</td><td className="px-5 py-4 text-slate-400">{relationName(lead.marketing_sources)}</td><td className="px-5 py-4 text-slate-400">{lead.salesperson ?? "Unassigned"}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs capitalize text-slate-300">{lead.status}</span></td></tr>)}</tbody></table></div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 xl:col-span-2">
        <div className="border-b border-slate-800 p-5"><h3 className="text-lg font-semibold">AI insight foundation</h3><p className="mt-1 text-sm text-slate-400">Sample insights only; no AI service is connected.</p></div>
        <div className="divide-y divide-slate-800">{(insightsResult.data ?? []).map((insight) => <article key={insight.id} className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">{insight.type}</p><h4 className="mt-1 font-semibold">{insight.title}</h4><p className="mt-2 text-sm leading-6 text-slate-400">{insight.summary}</p>{insight.recommendation ? <p className="mt-2 text-sm text-slate-300">Next: {insight.recommendation}</p> : null}</article>)}</div>
      </section>
    </div>

    <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-lg font-semibold">Connector readiness</h3><p className="mt-1 text-sm text-slate-400">Placeholder adapters are defined, but no live provider connection is active.</p></div><span className="w-fit rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">Foundation mode</span></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{providers.map((provider) => <article key={provider.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-xs text-slate-500">{provider.category}</p><h4 className="mt-1 font-semibold">{provider.name}</h4><p className="mt-3 text-xs text-slate-400">{configuredProviders.has(provider.id) ? "Configuration saved · connector inactive" : "Ready to configure · connector inactive"}</p></article>)}</div>
    </section>
  </>;
}

