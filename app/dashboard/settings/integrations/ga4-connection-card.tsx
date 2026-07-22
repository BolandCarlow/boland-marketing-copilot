"use client";

import { useActionState } from "react";
import type { Ga4Connection } from "@/lib/integrations/google-analytics";
import { performGa4Action, type Ga4ActionState } from "./ga4-actions";

const initialState: Ga4ActionState = { status: "idle", message: "" };
const dateTime = (value: string | null) => value ? new Date(value).toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" }) : "Not yet";

export function Ga4ConnectionCard({ connection }: { connection: Pick<Ga4Connection, "property_id" | "needs_reauth" | "last_refreshed_at" | "last_error"> | null }) {
  const [state, action, pending] = useActionState(performGa4Action, initialState);
  const connected = Boolean(connection && !connection.needs_reauth);
  return <article className="card integration-card">
    <div className="section-heading"><div><p className="eyebrow">Website analytics</p><h3>Google Analytics 4</h3></div><span className="pill">{connected ? "Connected" : connection ? "Reconnect required" : "Not connected"}</span></div>
    <p>Website sessions, users, engagement and conversions from your live GA4 property.</p>
    <div className="flex flex-wrap gap-2"><span className="pill">Analytics</span><span className="pill">Conversions</span></div>
    <dl className="detail-grid"><div><dt>Property ID</dt><dd>{connection?.property_id ?? "Not connected"}</dd></div><div><dt>Last refresh</dt><dd>{dateTime(connection?.last_refreshed_at ?? null)}</dd></div><div><dt>Schedule</dt><dd>Daily refresh</dd></div><div><dt>Status</dt><dd>{connected ? "Ready" : connection?.needs_reauth ? "Reconnect required" : "Awaiting connection"}</dd></div></dl>
    {connection?.last_error ? <p className="notice" role="alert">{connection.last_error}</p> : null}
    {!connected ? <form action="/api/integrations/google-analytics/connect" method="get"><button className="button primary" type="submit">Connect Google Analytics</button></form> : <div className="integration-actions"><form action={action}><input type="hidden" name="operation" value="test"/><button className="button" disabled={pending}>Test connection</button></form><form action={action}><input type="hidden" name="operation" value="sync"/><button className="button" disabled={pending}>Sync now</button></form><form action={action}><input type="hidden" name="operation" value="disconnect"/><button className="button" disabled={pending}>Disconnect</button></form></div>}
    {state.message ? <p className="notice" role="status">{state.message}</p> : null}
  </article>;
}
