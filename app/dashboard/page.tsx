import { integrations } from "@/lib/integrations/providers";

const stats = [
  ["Marketing spend", "Connect an ad account", "—"],
  ["Website sessions", "Connect Google Analytics 4", "—"],
  ["Leads", "Data will appear after your first sync", "—"],
  ["Return on ad spend", "Connect Google Ads or Meta Ads", "—"]
];

export default function DashboardPage() {
  return <>
    <header><p className="text-sm text-cyan-300">Overview</p><h2 className="mt-1 text-3xl font-bold">Good morning, Boland team.</h2><p className="mt-2 text-slate-400">Connect your marketing data to get a single, practical view of performance.</p></header>
    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, helper, value]) => <article key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-5 text-3xl font-bold">{value}</p><p className="mt-3 text-xs text-slate-500">{helper}</p></article>)}</section>
    <section className="mt-10"><div className="flex items-end justify-between"><div><h3 className="text-xl font-bold">Connect data sources</h3><p className="mt-1 text-sm text-slate-400">Credentials remain on the server; OAuth flows are ready to be wired to each provider.</p></div><span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">0 of 3 connected</span></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">{integrations.map((integration) => <article key={integration.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center justify-between"><h4 className="font-semibold">{integration.name}</h4><span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">Not connected</span></div><p className="mt-3 min-h-12 text-sm text-slate-400">{integration.description}</p><p className="mt-4 text-xs text-slate-500">Metrics: {integration.metrics.join(" · ")}</p><button className="mt-5 rounded-lg border border-cyan-400/50 px-3 py-2 text-sm font-medium text-cyan-300">Configure connection</button></article>)}</div>
    </section>
  </>;
}
