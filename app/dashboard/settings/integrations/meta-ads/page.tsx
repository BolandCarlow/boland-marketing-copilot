import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MetaAdsConnection } from "./meta-ads-connection";

type Setting = { account_identifier: string | null; encrypted_credentials: string | null; connection_status: string; scheduled_sync_enabled: boolean; last_sync_at: string | null; last_sync_status: string | null; last_error: string | null };
type History = { id: string; trigger_type: string; status: string; records_received: number; records_processed: number; completed_at: string | null; error_message: string | null; created_at: string };
type ErrorLog = { id: string; message: string; created_at: string; severity: string };
const displayDate = (value: string | null) => value ? new Date(value).toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" }) : "Not yet";

export default async function MetaAdsIntegrationPage({ searchParams }: { searchParams: Promise<{ status?: string; message?: string }> }) {
  const supabase = await createClient(); const params = await searchParams;
  const [settingResult, historyResult, errorsResult] = await Promise.all([
    supabase.from("integration_settings").select("account_identifier,encrypted_credentials,connection_status,scheduled_sync_enabled,last_sync_at,last_sync_status,last_error").eq("provider", "meta-ads").maybeSingle(),
    supabase.from("integration_sync_history").select("id,trigger_type,status,records_received,records_processed,completed_at,error_message,created_at").eq("provider", "meta-ads").order("created_at", { ascending: false }).limit(10),
    supabase.from("integration_error_logs").select("id,message,created_at,severity").eq("provider", "meta-ads").is("resolved_at", null).order("created_at", { ascending: false }).limit(5)
  ]);
  const setting = settingResult.data as Setting | null; const history = (historyResult.data ?? []) as History[]; const errors = (errorsResult.data ?? []) as ErrorLog[];
  return <><header className="page-header"><div><p className="eyebrow">Settings / Integrations / Meta Ads</p><h1 className="page-title">Meta Ads, connected responsibly.</h1><p className="page-intro">Connect Boland Carlow, review delivery, and keep daily reporting current.</p></div><Link className="button" href="/dashboard/settings/integrations">All integrations</Link></header>
    {params.message ? <div className="notice" role="status">{params.message}</div> : null}
    {settingResult.error || historyResult.error || errorsResult.error ? <div className="notice" role="status">Some Meta Ads status information could not be refreshed.</div> : null}
    <section className="settings-summary"><article className="card setting-stat"><p>Selected account</p><strong>{setting?.account_identifier ?? "Not selected"}</strong></article><article className="card setting-stat"><p>Last sync</p><strong>{displayDate(setting?.last_sync_at ?? null)}</strong></article><article className="card setting-stat"><p>Sync status</p><strong className="capitalize">{setting?.last_sync_status ?? "Not yet"}</strong></article></section>
    <MetaAdsConnection connected={Boolean(setting?.encrypted_credentials)} selectedAccount={setting?.account_identifier ?? null} autoDailySync={setting?.scheduled_sync_enabled ?? false}/>
    {setting?.last_error ? <section className="notice" role="status"><strong>Latest sync error:</strong> {setting.last_error}</section> : null}
    <section className="section two-grid"><article className="card table-card"><div className="table-head"><h2 className="section-title">Sync history</h2><p className="section-description">Manual and daily sync activity.</p></div>{history.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>When</th><th>Type</th><th>Status</th><th>Records</th></tr></thead><tbody>{history.map((item) => <tr key={item.id}><td>{displayDate(item.completed_at ?? item.created_at)}</td><td className="capitalize">{item.trigger_type}</td><td className="capitalize">{item.status}</td><td>{item.records_processed}/{item.records_received}</td></tr>)}</tbody></table></div> : <div className="empty-state"><div><strong>No syncs yet</strong><p>Once connected, the history of manual and daily runs will appear here.</p></div></div>}</article><aside className="card table-card"><div className="table-head"><h2 className="section-title">Connection errors</h2><p className="section-description">Safe, actionable errors. Tokens are never displayed.</p></div>{errors.length ? errors.map((item) => <article className="insight" key={item.id}><span className="insight-type">{item.severity}</span><p>{item.message}</p><span className="small">{displayDate(item.created_at)}</span></article>) : <div className="empty-state"><div><strong>No unresolved errors</strong><p>Connection and sync problems will be listed here if action is needed.</p></div></div>}</aside></section>
  </>;
}
