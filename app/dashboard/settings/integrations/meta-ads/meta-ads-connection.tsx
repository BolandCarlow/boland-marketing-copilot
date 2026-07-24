"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { initialMetaConnectionActionState, performMetaConnectionAction } from "./actions";

type Account = { id: string; name: string; accountStatus: number | null; currency: string | null };
type Business = { id: string; name: string; accounts: Account[] };
export type MetaConnectionView = {
  connectionStatus: string; businessManagerId: string | null; businessManagerName: string | null;
  adAccountId: string | null; adAccountName: string | null; scheduledSyncEnabled: boolean;
  syncFrequency: string; lastSyncAt: string | null; lastSyncStatus: string | null; lastTestStatus: string | null;
};

const dateTime = (value: string | null) => value ? new Date(value).toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" }) : "Not yet";

export function MetaAdsConnection({ connection }: { connection: MetaConnectionView | null }) {
  const [state, action, pending] = useActionState(performMetaConnectionAction, initialMetaConnectionActionState);
  const [businesses, setBusinesses] = useState<Business[]>([]); const [loading, setLoading] = useState(Boolean(connection)); const [loadError, setLoadError] = useState("");
  const [businessId, setBusinessId] = useState(connection?.businessManagerId ?? ""); const [accountId, setAccountId] = useState(connection?.adAccountId ?? "");
  const connected = connection?.connectionStatus === "connected";
  useEffect(() => {
    if (!connected) { setLoading(false); return; }
    fetch("/api/integrations/meta-ads/accounts").then(async (response) => {
      const body = await response.json() as { businesses?: Business[]; error?: string };
      if (!response.ok) throw new Error(body.error || "Meta account discovery failed.");
      const next = body.businesses ?? []; setBusinesses(next);
      if (!businessId && next.length === 1) setBusinessId(next[0].id);
    }).catch((exception: unknown) => setLoadError(exception instanceof Error ? exception.message : "Meta account discovery failed.")).finally(() => setLoading(false));
  }, [connected, businessId]);
  const selectedBusiness = useMemo(() => businesses.find((business) => business.id === businessId) ?? null, [businesses, businessId]);
  const selectedAccount = selectedBusiness?.accounts.find((account) => account.id === accountId) ?? null;

  if (!connected) return <section className="card section-card"><div className="empty-state"><div><p className="eyebrow">Meta Ads</p><strong>Connect your Meta Ads account</strong><p>Securely authorise Meta to discover your Business Managers and available ad accounts.</p></div><Link className="button primary" href="/api/integrations/meta-ads/connect">Connect Meta</Link></div></section>;

  return <section className="card section-card"><div className="section-heading"><div><p className="eyebrow">Meta Ads</p><h2 className="section-title">Meta Ads connection</h2><p className="section-description">Your Meta credentials are stored securely and never shown in this workspace.</p></div><span className="pill">{connection.adAccountId ? "Connected" : "Account selection required"}</span></div>
    <dl className="detail-grid"><div><dt>Business Manager</dt><dd>{connection.businessManagerName ?? "Select a Business Manager"}</dd></div><div><dt>Ad account</dt><dd>{connection.adAccountName ?? "Select an ad account"}</dd></div><div><dt>Ad account ID</dt><dd>{connection.adAccountId ?? "Not selected"}</dd></div><div><dt>Connection status</dt><dd className="capitalize">{connection.connectionStatus.replaceAll("_", " ")}</dd></div><div><dt>Last sync</dt><dd>{dateTime(connection.lastSyncAt)}</dd></div><div><dt>Last test</dt><dd className="capitalize">{connection.lastTestStatus ?? "Not yet"}</dd></div></dl>
    {loading ? <p className="notice" role="status">Discovering Business Managers and ad accounts…</p> : null}{loadError ? <p className="notice" role="alert">{loadError}</p> : null}
    {!loading && !loadError ? <form action={action} className="form-grid"><input type="hidden" name="operation" value="save"/><input type="hidden" name="businessManagerId" value={businessId}/><input type="hidden" name="businessManagerName" value={selectedBusiness?.name ?? ""}/><input type="hidden" name="adAccountId" value={accountId}/><input type="hidden" name="adAccountName" value={selectedAccount?.name ?? ""}/>
      {businesses.length > 1 ? <label>Business Manager<select value={businessId} onChange={(event) => { setBusinessId(event.target.value); setAccountId(""); }}><option value="">Choose a Business Manager</option>{businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}</select></label> : <p className="small">{businesses.length === 1 ? `${businesses[0].name} was selected automatically.` : "No Business Manager was returned by Meta."}</p>}
      <label>Ad account<select value={accountId} onChange={(event) => setAccountId(event.target.value)} disabled={!selectedBusiness}><option value="">Choose an ad account</option>{selectedBusiness?.accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.id}{account.currency ? ` · ${account.currency}` : ""}</option>)}</select></label>
      <label>Sync frequency<select name="syncFrequency" defaultValue={connection.syncFrequency}><option value="hourly">Hourly</option><option value="every_6_hours">Every 6 hours</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label><label className="flex items-center gap-2"><input type="checkbox" name="scheduledSyncEnabled" defaultChecked={connection.scheduledSyncEnabled}/> Automatic sync</label><button className="button primary" disabled={pending || !selectedAccount}>{pending ? "Saving…" : "Save connection"}</button></form> : null}
    <div className="integration-actions"><form action={action}><input type="hidden" name="operation" value="test"/><button className="button" disabled={pending || !connection.adAccountId}>Test Connection</button></form><form action={action}><input type="hidden" name="operation" value="sync"/><button className="button primary" disabled={pending || !connection.adAccountId}>Sync Now</button></form><form action={action}><input type="hidden" name="operation" value="disconnect"/><button className="button" disabled={pending}>Disconnect</button></form></div>
    {state.message ? <p className="notice" role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
  </section>;
}
