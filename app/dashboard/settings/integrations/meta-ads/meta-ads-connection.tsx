"use client";

import Link from "next/link";
import { useActionState } from "react";
import { initialMetaConnectionSettingsState, saveMetaConnectionSettings } from "./actions";

export function MetaAdsConnection({ status, scheduleEnabled }: { status: string; scheduleEnabled: boolean }) {
  const [state, action, pending] = useActionState(saveMetaConnectionSettings, initialMetaConnectionSettingsState);
  const awaitingExchange = status === "authorization_pending_exchange";
  return <section className="card section-card"><div className="section-heading"><div><p className="eyebrow">Meta Ads</p><h2 className="section-title">OAuth connection</h2><p className="section-description">Credentials remain server-side and encrypted. Live Meta token exchange and reporting are disabled in this release.</p></div><span className="pill">{status.replaceAll("_", " ")}</span></div>
    {awaitingExchange ? <div className="notice" role="status">Authorisation code received and encrypted. The future token-exchange step is deliberately disabled, so no Meta API call has been made.</div> : <Link className="button primary" href="/api/integrations/meta-ads/connect">Start Meta OAuth</Link>}
    <form action={action} className="form-grid"><label className="flex items-center gap-2"><input type="checkbox" name="scheduledSyncEnabled" defaultChecked={scheduleEnabled}/> Record daily pending snapshots</label><button className="button" disabled={pending}>{pending ? "Saving…" : "Save schedule"}</button></form>
    <p className="small">The supplied Supabase Edge Function records a schedule checkpoint only. It does not fetch ad accounts, refresh a token, or request insights.</p>
    {state.message ? <p className="notice" role="status">{state.message}</p> : null}
  </section>;
}
