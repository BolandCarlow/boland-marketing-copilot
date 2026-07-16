"use client";

import { useActionState } from "react";
import type { ProviderDefinition } from "@/lib/data-platform/providers";
import { performIntegrationAction, type IntegrationActionState } from "./actions";

export type CurrentIntegration = {
  connectionStatus: string;
  authenticationType: string;
  accountIdentifier: string;
  notes: string;
  hasCredentials: boolean;
  scheduledSyncEnabled: boolean;
  syncFrequency: string;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastTestedAt: string | null;
  testStatus: string | null;
};

const initialState: IntegrationActionState = { status: "idle", message: "" };
const authLabels: Record<string, string> = { oauth: "OAuth", api_key: "API key", service_account: "Service account", webhook: "Webhook secret" };

function dateTime(value: string | null) {
  return value ? new Date(value).toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" }) : "Never";
}

export function IntegrationCard({ provider, current }: { provider: ProviderDefinition; current: CurrentIntegration }) {
  const [state, action, pending] = useActionState(performIntegrationAction, initialState);
  const connected = current.connectionStatus === "connected";

  return <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
    <div className="flex items-start justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{provider.category}</p><h3 className="mt-1 text-lg font-semibold">{provider.name}</h3></div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${connected ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-800 text-slate-300"}`}>
        {connected ? "Connected" : "Not Connected"}
      </span>
    </div>
    <p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">{provider.description}</p>
    <div className="mt-4 flex flex-wrap gap-2">{provider.capabilities.map((capability) => <span key={capability} className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-400">{capability}</span>)}</div>

    <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm">
      <div><dt className="text-xs text-slate-500">Last Sync</dt><dd className="mt-1 font-medium text-slate-200">{dateTime(current.lastSyncAt)}</dd></div>
      <div><dt className="text-xs text-slate-500">Sync Status</dt><dd className="mt-1 font-medium capitalize text-slate-200">{current.lastSyncStatus ?? "Never synced"}</dd></div>
      <div><dt className="text-xs text-slate-500">Schedule</dt><dd className="mt-1 font-medium capitalize text-slate-200">{current.scheduledSyncEnabled ? current.syncFrequency.replaceAll("_", " ") : "Manual"}</dd></div>
      <div><dt className="text-xs text-slate-500">Last Test</dt><dd className="mt-1 font-medium text-slate-200">{dateTime(current.lastTestedAt)}</dd></div>
    </dl>

    <div className="mt-5 grid grid-cols-2 gap-2">
      <details className="group col-span-2">
        <summary className="cursor-pointer list-none rounded-lg bg-cyan-400 px-3 py-2 text-center text-sm font-semibold text-slate-950">Configure</summary>
        <div className="mt-4 border-t border-slate-800 pt-4">
          <form action={action} className="space-y-4">
            <input type="hidden" name="provider" value={provider.id} /><input type="hidden" name="operation" value="save" />
            <label className="block text-sm font-medium text-slate-200">Authentication
              <select name="authenticationType" defaultValue={current.authenticationType || provider.defaultAuthenticationType} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-400">
                {provider.authenticationTypes.map((type) => <option key={type} value={type}>{authLabels[type]}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-200">{provider.accountLabel}
              <input name="accountIdentifier" defaultValue={current.accountIdentifier} placeholder={provider.accountPlaceholder} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-400" />
            </label>
            <label className="block text-sm font-medium text-slate-200">{provider.credentialLabel}
              <textarea name="credentials" rows={3} placeholder={current.hasCredentials ? "Stored securely — leave blank to keep it" : provider.credentialPlaceholder} className="mt-2 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-400" />
            </label>
            <label className="block text-sm font-medium text-slate-200">Internal notes
              <input name="notes" defaultValue={current.notes} placeholder="Optional setup notes" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-400" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-200">Automatic sync
                <select name="syncFrequency" defaultValue={current.syncFrequency || "daily"} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-400">
                  <option value="hourly">Hourly</option><option value="every_6_hours">Every 6 hours</option><option value="daily">Daily</option><option value="weekly">Weekly</option>
                </select>
              </label>
              <label className="flex items-end gap-3 pb-2 text-sm text-slate-300"><input type="checkbox" name="scheduledSyncEnabled" defaultChecked={current.scheduledSyncEnabled} className="h-4 w-4 accent-cyan-400" />Enable schedule</label>
            </div>
            <button disabled={pending} className="w-full rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending ? "Saving…" : "Save configuration"}</button>
          </form>
        </div>
      </details>
      <form action={action}><input type="hidden" name="provider" value={provider.id} /><input type="hidden" name="operation" value="test" /><button disabled={pending} className="h-full w-full rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400">Test Connection</button></form>
      <form action={action}><input type="hidden" name="provider" value={provider.id} /><input type="hidden" name="operation" value="sync" /><button disabled={pending} className="h-full w-full rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400">Sync Now</button></form>
    </div>
    {state.message ? <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${state.status === "error" ? "bg-rose-400/10 text-rose-200" : "bg-emerald-400/10 text-emerald-200"}`} role="status">{state.message}</p> : null}
  </article>;
}

