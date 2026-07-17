import "server-only";
import { decryptCredential } from "@/lib/data-platform/security";
import type { ConnectionTestResult, IntegrationAdapter, IntegrationConfiguration, SyncResult } from "./adapter-registry";

type MetaCredential = { accessToken: string; expiresAt?: string | null };
export type MetaAdAccount = { id: string; name: string; accountStatus: number | null; currency: string | null };
type MetaGraphError = { error?: { message?: string; code?: number; error_subcode?: number } };
type MetaAction = { action_type?: string; value?: string };
type MetaInsight = { date_start: string; campaign_id: string; campaign_name?: string; impressions?: string; reach?: string; clicks?: string; spend?: string; ctr?: string; cpc?: string; cpm?: string; actions?: MetaAction[] };

const apiVersion = () => process.env.META_GRAPH_API_VERSION || "v23.0";
const graphUrl = (path: string) => `https://graph.facebook.com/${apiVersion()}/${path.replace(/^\//, "")}`;
const asNumber = (value: string | undefined) => Number.isFinite(Number(value)) ? Number(value) : 0;

function credentials(configuration: IntegrationConfiguration): MetaCredential {
  if (!configuration.encryptedCredentials) throw new Error("Connect Meta Ads before running a sync.");
  const decoded = decryptCredential(configuration.encryptedCredentials);
  try {
    const value = JSON.parse(decoded) as MetaCredential;
    if (typeof value.accessToken === "string" && value.accessToken) return value;
  } catch {
    if (decoded.trim()) return { accessToken: decoded.trim() };
  }
  throw new Error("The stored Meta credential is invalid. Reconnect Meta Ads to continue.");
}

function errorMessage(payload: MetaGraphError, fallback: string) {
  const message = payload.error?.message?.trim();
  if (!message) return fallback;
  return `Meta Ads: ${message.slice(0, 300)}`;
}

async function request<T>(path: string, token: string, parameters: Record<string, string> = {}) {
  const url = new URL(graphUrl(path));
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("access_token", token);
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => ({})) as T & MetaGraphError;
  if (!response.ok || payload.error) throw new Error(errorMessage(payload, `Meta Ads request failed (${response.status}).`));
  return payload;
}

function actionCount(actions: MetaAction[] | undefined, types: string[]) {
  return (actions ?? []).filter((action) => types.includes(action.action_type ?? "")).reduce((total, action) => total + asNumber(action.value), 0);
}

export async function listMetaAdAccounts(encryptedCredentials: string): Promise<MetaAdAccount[]> {
  const { accessToken } = credentials({ accountIdentifier: null, hasCredentials: true, authenticationType: "oauth", encryptedCredentials });
  const response = await request<{ data?: { id: string; name?: string; account_status?: number; currency?: string }[] }>("me/adaccounts", accessToken, {
    fields: "id,name,account_status,currency",
    limit: "100"
  });
  return (response.data ?? []).map((account) => ({ id: account.id, name: account.name ?? account.id, accountStatus: account.account_status ?? null, currency: account.currency ?? null }));
}

class MetaAdsAdapter implements IntegrationAdapter {
  readonly provider = "meta-ads" as const;
  readonly live = true;

  async testConnection(configuration: IntegrationConfiguration): Promise<ConnectionTestResult> {
    const configurationValid = Boolean(configuration.accountIdentifier && configuration.encryptedCredentials);
    if (!configurationValid) return { ok: false, configurationValid: false, liveConnectionAttempted: false, message: "Connect Meta Ads and choose an ad account before testing." };
    try {
      const { accessToken } = credentials(configuration);
      const account = await request<{ id?: string; name?: string }>(configuration.accountIdentifier!, accessToken, { fields: "id,name" });
      return { ok: Boolean(account.id), configurationValid: true, liveConnectionAttempted: true, message: `Connected to ${account.name ?? configuration.accountIdentifier}.` };
    } catch (error) {
      return { ok: false, configurationValid: true, liveConnectionAttempted: true, message: error instanceof Error ? error.message : "Meta Ads connection test failed." };
    }
  }

  async sync(configuration: IntegrationConfiguration): Promise<SyncResult> {
    if (!configuration.accountIdentifier || !configuration.encryptedCredentials) {
      return { status: "skipped", recordsReceived: 0, recordsProcessed: 0, liveConnectionAttempted: false, message: "Connect Meta Ads and choose an ad account before syncing." };
    }
    try {
      const { accessToken } = credentials(configuration);
      const until = new Date(); const since = new Date(until); since.setDate(since.getDate() - 29);
      const response = await request<{ data?: MetaInsight[] }>(`${configuration.accountIdentifier}/insights`, accessToken, {
        level: "campaign",
        time_increment: "1",
        time_range: JSON.stringify({ since: since.toISOString().slice(0, 10), until: until.toISOString().slice(0, 10) }),
        fields: "date_start,campaign_id,campaign_name,impressions,reach,clicks,spend,ctr,cpc,cpm,actions",
        limit: "500"
      });
      const records = (response.data ?? []).filter((row) => row.date_start && row.campaign_id).map((row) => ({
        date: row.date_start,
        campaignId: row.campaign_id,
        campaignName: row.campaign_name,
        impressions: asNumber(row.impressions), reach: asNumber(row.reach), clicks: asNumber(row.clicks), spend: asNumber(row.spend),
        linkClicks: actionCount(row.actions, ["link_click"]),
        leads: actionCount(row.actions, ["lead", "onsite_conversion.lead_grouped"]),
        ctr: asNumber(row.ctr), cpc: asNumber(row.cpc), cpm: asNumber(row.cpm), raw: row
      }));
      return { status: "success", recordsReceived: records.length, recordsProcessed: 0, records, liveConnectionAttempted: true, message: `Synced ${records.length} Meta Ads campaign-day records.` };
    } catch (error) {
      return { status: "failed", recordsReceived: 0, recordsProcessed: 0, liveConnectionAttempted: true, message: error instanceof Error ? error.message : "Meta Ads sync failed." };
    }
  }
}

export const metaAdsAdapter = new MetaAdsAdapter();
