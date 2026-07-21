"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { performIntegrationAction, type IntegrationActionState } from "../actions";
import { saveMetaAdAccount, type MetaAccountActionState } from "./actions";

type Account = { id: string; name: string; accountStatus: number | null; currency: string | null };
const idle: IntegrationActionState = { status: "idle", message: "" };
const accountIdle: MetaAccountActionState = { status: "idle", message: "" };

export function MetaAdsConnection({ connected, selectedAccount, autoDailySync }: { connected: boolean; selectedAccount: string | null; autoDailySync: boolean }) {
  const [accounts, setAccounts] = useState<Account[]>([]); const [loading, setLoading] = useState(false); const [loadError, setLoadError] = useState("");
  const [accountState, accountAction, accountPending] = useActionState(saveMetaAdAccount, accountIdle);
  const [syncState, syncAction, syncPending] = useActionState(performIntegrationAction, idle);
  useEffect(() => {
    if (!connected) return;
    setLoading(true); fetch("/api/integrations/meta-ads/accounts").then(async (response) => {
      const body = await response.json() as { accounts?: Account[]; error?: string };
      if (!response.ok) throw new Error(body.error || "Meta ad accounts could not be loaded."); setAccounts(body.accounts ?? []);
    }).catch((error: unknown) => setLoadError(error instanceof Error ? error.message : "Meta ad accounts could not be loaded.")).finally(() => setLoading(false));
  }, [connected]);

  return <section className="card section-card"><div className="section-heading"><div><p className="eyebrow">Meta Ads</p><h2 className="section-title">Production connection</h2><p className="section-description">OAuth credentials are encrypted before storage. The app reads performance only.</p></div><span className="pill">{connected ? "Authorised" : "Not connected"}</span></div>
    {!connected ? <Link className="button primary" href="/api/integrations/meta-ads/connect">Connect Meta Ads</Link> : <>
      <form action={accountAction} className="form-grid"><label>Meta ad account<select name="accountIdentifier" defaultValue={selectedAccount ?? ""} disabled={loading || !accounts.length}><option value="">{loading ? "Loading accounts…" : "Choose an ad account"}</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.id}{account.currency ? ` · ${account.currency}` : ""}</option>)}</select></label><label className="flex items-center gap-2"><input type="checkbox" name="scheduledSyncEnabled" defaultChecked={autoDailySync}/> Auto daily sync</label><button className="button primary" disabled={accountPending || loading || !accounts.length}>{accountPending ? "Saving…" : "Save Meta connection"}</button></form>
      {loadError ? <p className="notice" role="status">{loadError}</p> : null}{accountState.message ? <p className="notice" role="status">{accountState.message}</p> : null}
      <div className="integration-actions"><form action={syncAction}><input type="hidden" name="provider" value="meta-ads"/><input type="hidden" name="operation" value="test"/><button className="button" disabled={syncPending}>Test connection</button></form><form action={syncAction}><input type="hidden" name="provider" value="meta-ads"/><input type="hidden" name="operation" value="sync"/><button className="button primary" disabled={syncPending}>Manual sync</button></form></div>{syncState.message ? <p className="notice" role="status">{syncState.message}</p> : null}
    </>}
  </section>;
}
