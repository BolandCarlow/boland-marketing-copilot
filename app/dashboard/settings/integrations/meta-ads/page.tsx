import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MetaAdsConnection } from "./meta-ads-connection";

type Connection = { connection_status: string; authorization_received_at: string | null; scheduled_sync_enabled: boolean; last_scheduled_at: string | null; last_refresh_attempt_at: string | null; last_refresh_error: string | null };
type Snapshot = { id: string; snapshot_date: string; status: string; created_at: string };
const display = (value: string | null) => value ? new Date(value).toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" }) : "Not yet";

export default async function MetaAdsIntegrationPage({ searchParams }: { searchParams: Promise<{ status?: string; message?: string }> }) {
  const supabase = await createClient(); const params = await searchParams;
  const [connectionResult, snapshotsResult] = await Promise.all([
    supabase.from("meta_connections").select("connection_status,authorization_received_at,scheduled_sync_enabled,last_scheduled_at,last_refresh_attempt_at,last_refresh_error").maybeSingle(),
    supabase.from("meta_snapshots").select("id,snapshot_date,status,created_at").order("created_at", { ascending: false }).limit(10)
  ]);
  const connection = connectionResult.data as Connection | null; const snapshots = (snapshotsResult.data ?? []) as Snapshot[];
  const status = connection?.connection_status ?? "not_connected";
  return <><header className="page-header"><div><p className="eyebrow">Settings / Integrations / Meta Ads</p><h1 className="page-title">Meta Ads OAuth foundation.</h1><p className="page-intro">Secure connection storage and scheduling are ready. Live Meta API calls are intentionally out of scope.</p></div><Link className="button" href="/dashboard/settings/integrations">All integrations</Link></header>
    {params.message ? <div className="notice" role="status">{params.message}</div> : null}
    {connectionResult.error || snapshotsResult.error ? <div className="notice" role="status">Apply the Meta OAuth migration before configuring this integration.</div> : null}
    <section className="settings-summary"><article className="card setting-stat"><p>Connection</p><strong className="capitalize">{status.replaceAll("_", " ")}</strong></article><article className="card setting-stat"><p>Authorisation received</p><strong>{display(connection?.authorization_received_at ?? null)}</strong></article><article className="card setting-stat"><p>Last schedule</p><strong>{display(connection?.last_scheduled_at ?? null)}</strong></article></section>
    <MetaAdsConnection status={status} scheduleEnabled={connection?.scheduled_sync_enabled ?? false}/>
    {connection?.last_refresh_error ? <div className="notice" role="status"><strong>Refresh status:</strong> {connection.last_refresh_error}</div> : null}
    <section className="section card table-card"><div className="table-head"><h2 className="section-title">Scheduled snapshots</h2><p className="section-description">Checkpoints created without contacting Meta.</p></div>{snapshots.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Date</th><th>Status</th><th>Created</th></tr></thead><tbody>{snapshots.map((snapshot) => <tr key={snapshot.id}><td>{snapshot.snapshot_date}</td><td className="capitalize">{snapshot.status}</td><td>{display(snapshot.created_at)}</td></tr>)}</tbody></table></div> : <div className="empty-state"><div><strong>No snapshots yet</strong><p>Deploy and schedule the Edge Function after applying the migration to record the first checkpoint.</p></div></div>}</section>
  </>;
}
