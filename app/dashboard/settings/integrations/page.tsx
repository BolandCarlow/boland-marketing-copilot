import { providers, getProvider } from "@/lib/data-platform/providers";
import { createClient } from "@/lib/supabase/server";
import { IntegrationCard, type CurrentIntegration } from "./integration-card";

type SettingRow = {
  provider: string; connection_status: string; authentication_type: string;
  account_identifier: string | null; configuration: { notes?: string } | null;
  encrypted_credentials: string | null; scheduled_sync_enabled: boolean;
  sync_frequency: string; last_sync_at: string | null; last_sync_status: string | null;
  last_tested_at: string | null; test_status: string | null;
};

function statusClass(status: string) {
  if (status === "success") return "bg-emerald-400/10 text-emerald-300";
  if (status === "failed") return "bg-rose-400/10 text-rose-300";
  return "bg-slate-800 text-slate-300";
}

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const [settingsResult, historyResult, errorsResult] = await Promise.all([
    supabase.from("integration_settings").select("provider,connection_status,authentication_type,account_identifier,configuration,encrypted_credentials,scheduled_sync_enabled,sync_frequency,last_sync_at,last_sync_status,last_tested_at,test_status"),
    supabase.from("integration_sync_history").select("id,provider,trigger_type,status,records_processed,created_at,error_message,details").order("created_at", { ascending: false }).limit(12),
    supabase.from("integration_error_logs").select("id,provider,severity,error_code,message,created_at,resolved_at").is("resolved_at", null).order("created_at", { ascending: false }).limit(8)
  ]);
  const settings = new Map(((settingsResult.data ?? []) as SettingRow[]).map((row) => [row.provider, row]));
  const connectedCount = [...settings.values()].filter((setting) => setting.connection_status === "connected").length;
  const scheduledCount = [...settings.values()].filter((setting) => setting.scheduled_sync_enabled).length;

  return <>
    <header>
      <p className="text-sm font-medium text-cyan-300">Settings <span className="text-slate-600">/</span> Integrations</p>
      <h2 className="mt-1 text-3xl font-bold">Integrations Centre</h2>
      <p className="mt-2 max-w-3xl text-slate-400">Configure credentials, schedules and sync controls from one secure workspace. Provider adapters remain offline until live API access is enabled.</p>
    </header>

    <section className="mt-6 grid gap-3 sm:grid-cols-3">
      <article className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs text-slate-500">Available integrations</p><p className="mt-1 text-2xl font-bold">{providers.length}</p></article>
      <article className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs text-slate-500">Connected</p><p className="mt-1 text-2xl font-bold">{connectedCount}</p></article>
      <article className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs text-slate-500">Schedules enabled</p><p className="mt-1 text-2xl font-bold">{scheduledCount}</p></article>
    </section>

    <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">Foundation mode: configuration tests validate stored fields only. Test and sync controls never contact Google, Meta, Gmail or marketplace APIs.</div>

    <section className="mt-7 grid gap-5 xl:grid-cols-2">{providers.map((provider) => {
      const row = settings.get(provider.id);
      const current: CurrentIntegration = {
        connectionStatus: row?.connection_status ?? "not_connected",
        authenticationType: row?.authentication_type ?? provider.defaultAuthenticationType,
        accountIdentifier: row?.account_identifier ?? "",
        notes: row?.configuration?.notes ?? "",
        hasCredentials: Boolean(row?.encrypted_credentials),
        scheduledSyncEnabled: row?.scheduled_sync_enabled ?? false,
        syncFrequency: row?.sync_frequency ?? "daily",
        lastSyncAt: row?.last_sync_at ?? null,
        lastSyncStatus: row?.last_sync_status ?? null,
        lastTestedAt: row?.last_tested_at ?? null,
        testStatus: row?.test_status ?? null
      };
      return <IntegrationCard key={provider.id} provider={provider} current={current} />;
    })}</section>

    <div className="mt-7 grid gap-6 xl:grid-cols-2">
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-5"><h3 className="text-lg font-semibold">Sync history</h3><p className="mt-1 text-sm text-slate-400">Manual, scheduled and connection-test activity.</p></div>
        <div className="divide-y divide-slate-800">{(historyResult.data ?? []).length ? (historyResult.data ?? []).map((entry) => <article key={entry.id} className="flex items-center justify-between gap-4 p-4"><div className="min-w-0"><p className="truncate text-sm font-medium">{getProvider(entry.provider)?.name ?? entry.provider}</p><p className="mt-1 text-xs capitalize text-slate-500">{entry.trigger_type.replaceAll("_", " ")} · {new Date(entry.created_at).toLocaleString("en-IE")}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(entry.status)}`}>{entry.status}</span></article>) : <p className="p-8 text-center text-sm text-slate-500">No sync activity yet.</p>}</div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-5"><h3 className="text-lg font-semibold">Error log</h3><p className="mt-1 text-sm text-slate-400">Structured connector errors without sensitive credentials.</p></div>
        <div className="divide-y divide-slate-800">{(errorsResult.data ?? []).length ? (errorsResult.data ?? []).map((error) => <article key={error.id} className="p-4"><div className="flex items-center justify-between gap-4"><p className="text-sm font-medium">{getProvider(error.provider)?.name ?? error.provider}</p><span className="text-xs uppercase text-rose-300">{error.severity}</span></div><p className="mt-2 text-sm text-slate-400">{error.message}</p><p className="mt-1 text-xs text-slate-600">{new Date(error.created_at).toLocaleString("en-IE")}</p></article>) : <div className="p-8 text-center"><p className="text-sm font-medium text-emerald-300">No unresolved errors</p><p className="mt-1 text-xs text-slate-500">Errors will appear here when adapters are activated.</p></div>}</div>
      </section>
    </div>
  </>;
}
