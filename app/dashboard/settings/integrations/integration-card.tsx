"use client";

import { useActionState } from "react";
import type { ProviderDefinition } from "@/lib/data-platform/providers";
import { performIntegrationAction, type IntegrationActionState } from "./actions";

export type CurrentIntegration = { connectionStatus: string; authenticationType: string; accountIdentifier: string; notes: string; hasCredentials: boolean; scheduledSyncEnabled: boolean; syncFrequency: string; lastSyncAt: string | null; lastSyncStatus: string | null; lastTestedAt: string | null; testStatus: string | null };
const initialState: IntegrationActionState = { status: "idle", message: "" };
const authLabels: Record<string, string> = { oauth: "OAuth", api_key: "API key", service_account: "Service account", webhook: "Webhook secret" };
const dateTime = (value: string | null) => value ? new Date(value).toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" }) : "Not yet";

export function IntegrationCard({ provider, current }: { provider: ProviderDefinition; current: CurrentIntegration }) {
  const [state, action, pending] = useActionState(performIntegrationAction, initialState);
  const connected = current.connectionStatus === "connected";
  return <article className="card integration-card">
    <div className="section-heading"><div><p className="eyebrow">{provider.category}</p><h3>{provider.name}</h3></div><span className="pill">{connected ? "Connected" : "Not connected"}</span></div>
    <p>{provider.description}</p><div className="flex flex-wrap gap-2">{provider.capabilities.map((capability) => <span className="pill" key={capability}>{capability}</span>)}</div>
    <dl className="detail-grid"><div><dt>Last sync</dt><dd>{dateTime(current.lastSyncAt)}</dd></div><div><dt>Status</dt><dd className="capitalize">{current.lastSyncStatus ?? "No sync yet"}</dd></div><div><dt>Schedule</dt><dd>{current.scheduledSyncEnabled ? current.syncFrequency.replaceAll("_", " ") : "Manual"}</dd></div><div><dt>Last test</dt><dd>{dateTime(current.lastTestedAt)}</dd></div></dl>
    <details><summary className="button primary">Configure</summary><form action={action} className="form-grid"><input type="hidden" name="provider" value={provider.id}/><input type="hidden" name="operation" value="save"/><label>Authentication<select name="authenticationType" defaultValue={current.authenticationType || provider.defaultAuthenticationType}>{provider.authenticationTypes.map((type) => <option key={type} value={type}>{authLabels[type]}</option>)}</select></label><label>{provider.accountLabel}<input name="accountIdentifier" defaultValue={current.accountIdentifier} placeholder={provider.accountPlaceholder}/></label><label>{provider.credentialLabel}<textarea name="credentials" rows={3} placeholder={current.hasCredentials ? "Stored securely — leave blank to keep it" : provider.credentialPlaceholder}/></label><label>Internal notes<input name="notes" defaultValue={current.notes} placeholder="Optional setup notes"/></label><label>Automatic sync<select name="syncFrequency" defaultValue={current.syncFrequency || "daily"}><option value="hourly">Hourly</option><option value="every_6_hours">Every 6 hours</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label><label className="flex items-center gap-2"><input type="checkbox" name="scheduledSyncEnabled" defaultChecked={current.scheduledSyncEnabled}/> Enable schedule</label><button className="button primary" disabled={pending}>{pending ? "Saving…" : "Save configuration"}</button></form></details>
    <div className="integration-actions"><form action={action}><input type="hidden" name="provider" value={provider.id}/><input type="hidden" name="operation" value="test"/><button className="button" disabled={pending}>Test connection</button></form><form action={action}><input type="hidden" name="provider" value={provider.id}/><input type="hidden" name="operation" value="sync"/><button className="button" disabled={pending}>Sync now</button></form></div>
    {state.message ? <p className="notice" role="status">{state.message}</p> : null}
  </article>;
}
