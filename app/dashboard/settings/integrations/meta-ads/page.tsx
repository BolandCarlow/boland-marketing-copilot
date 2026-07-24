import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MetaAdsConnection, type MetaConnectionView } from "./meta-ads-connection";

type Snapshot = { id: string; snapshot_date: string; status: string; created_at: string; error_message: string | null };
const display = (value: string | null) => value ? new Date(value).toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" }) : "Not yet";

export default async function MetaAdsIntegrationPage({ searchParams }: { searchParams: Promise<{ status?: string; message?: string }> }) {
  const supabase = await createClient(); const params = await searchParams;
  const [connectionResult, snapshotsResult] = await Promise.all([
    supabase.from("meta_connections").select("connection_status,business_manager_id,business_manager_name,ad_account_id,ad_account_name,scheduled_sync_enabled,sync_frequency,last_sync_at,last_sync_status,last_tested_at,last_test_status,last_refresh_error").maybeSingle(),
    supabase.from("meta_snapshots").select("id,snapshot_date,status,created_at,error_message").order("created_at", { ascending: false }).limit(10)
  ]);
  const connection = connectionResult.data ? {
    connectionStatus: connectionResult.data.connection_status, businessManagerId: connectionResult.data.business_manager_id, businessManagerName: connectionResult.data.business_manager_name,
    adAccountId: connectionResult.data.ad_account_id, adAccountName: connectionResult.data.ad_account_name, scheduledSyncEnabled: connectionResult.data.scheduled_sync_enabled,
    syncFrequency: connectionResult.data.sync_frequency, lastSyncAt: connectionResult.data.last_sync_at, lastSyncStatus: connectionResult.data.last_sync_status, lastTestStatus: connectionResult.data.last_test_status
  } satisfies MetaConnectionView : null;
  const snapshots = (snapshotsResult.data ?? []) as Snapshot[];
  return <><header className="page-header"><div><p className="eyebrow">Settings / Integrations / Meta Ads</p><h1 className="page-title">Meta Ads, connected responsibly.</h1><p className="page-intro">Connect through Meta, choose a Business Manager and ad account, and keep reporting in sync.</p></div><Link className="button" href="/dashboard/settings/integrations">All integrations</Link></header>
    {params.message ? <div className="notice" role={params.status === "error" ? "alert" : "status"}>{params.message}</div> : null}
    {connectionResult.error || snapshotsResult.error ? <div className="notice" role="status">Apply the Meta connection migrations before configuring this integration.</div> : null}
    <section className="settings-summary"><article className="card setting-stat"><p>Business Manager</p><strong>{connection?.businessManagerName ?? "Not selected"}</strong></article><article className="card setting-stat"><p>Ad account</p><strong>{connection?.adAccountName ?? "Not selected"}</strong></article><article className="card setting-stat"><p>Last sync</p><strong>{display(connection?.lastSyncAt ?? null)}</strong></article></section>
    <MetaAdsConnection connection={connection}/>
    {connectionResult.data?.last_refresh_error ? <div className="notice" role="alert"><strong>Latest connection error:</strong> {connectionResult.data.last_refresh_error}</div> : null}
    {connection ? <section className="section card table-card"><div className="table-head"><h2 className="section-title">Sync history</h2><p className="section-description">Manual and scheduled Meta sync activity.</p></div>{snapshots.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Date</th><th>Status</th><th>Created</th><th>Details</th></tr></thead><tbody>{snapshots.map((snapshot) => <tr key={snapshot.id}><td>{snapshot.snapshot_date}</td><td className="capitalize">{snapshot.status}</td><td>{display(snapshot.created_at)}</td><td>{snapshot.error_message ?? "—"}</td></tr>)}</tbody></table></div> : <div className="empty-state"><div><strong>No syncs yet</strong><p>Use Sync Now after choosing an ad account, or enable Automatic Sync.</p></div></div>}</section> : null}
  </>;
}
