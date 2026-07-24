import "server-only";

import { metaOAuthConfiguration } from "./oauth";

type MetaGraphError = { error?: { message?: string; code?: number; error_subcode?: number } };
type TokenResponse = { access_token?: string; expires_in?: number } & MetaGraphError;

export type MetaAdAccount = { id: string; name: string; accountStatus: number | null; currency: string | null };
export type MetaBusiness = { id: string; name: string; accounts: MetaAdAccount[] };
export type MetaToken = { accessToken: string; expiresAt: string | null };

const graphUrl = (path: string) => `https://graph.facebook.com/${metaOAuthConfiguration().graphVersion}/${path.replace(/^\//, "")}`;
const asNumber = (value: string | number | undefined) => Number.isFinite(Number(value)) ? Number(value) : 0;

function message(payload: MetaGraphError, fallback: string) {
  return payload.error?.message?.trim() ? `Meta Ads: ${payload.error.message.slice(0, 300)}` : fallback;
}

async function graphRequest<T>(path: string, accessToken: string, parameters: Record<string, string> = {}) {
  const url = new URL(graphUrl(path));
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => ({})) as T & MetaGraphError;
  if (!response.ok || payload.error) throw new Error(message(payload, `Meta Ads request failed (${response.status}).`));
  return payload;
}

async function tokenRequest(parameters: Record<string, string>) {
  const config = metaOAuthConfiguration();
  const url = new URL(graphUrl("oauth/access_token"));
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => ({})) as TokenResponse;
  if (!response.ok || !payload.access_token) throw new Error(message(payload, "Meta did not return an access token."));
  return { accessToken: payload.access_token, expiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : null };
}

export async function exchangeMetaOAuthCode(code: string): Promise<MetaToken> {
  const config = metaOAuthConfiguration();
  const shortLived = await tokenRequest({ client_id: config.appId, client_secret: config.appSecret, redirect_uri: config.redirectUri, code });
  return tokenRequest({ grant_type: "fb_exchange_token", client_id: config.appId, client_secret: config.appSecret, fb_exchange_token: shortLived.accessToken });
}

export async function refreshMetaLongLivedToken(accessToken: string): Promise<MetaToken> {
  const config = metaOAuthConfiguration();
  return tokenRequest({ grant_type: "fb_exchange_token", client_id: config.appId, client_secret: config.appSecret, fb_exchange_token: accessToken });
}

function normaliseAccount(account: { id: string; name?: string; account_status?: number; currency?: string }): MetaAdAccount {
  return { id: account.id, name: account.name ?? account.id, accountStatus: account.account_status ?? null, currency: account.currency ?? null };
}

export async function discoverMetaBusinesses(accessToken: string): Promise<MetaBusiness[]> {
  const accountFields = "id,name,account_status,currency";
  const businesses = await graphRequest<{ data?: { id: string; name?: string }[] }>("me/businesses", accessToken, { fields: "id,name", limit: "100" });
  const found = await Promise.all((businesses.data ?? []).map(async (business) => {
    const [owned, client] = await Promise.all([
      graphRequest<{ data?: { id: string; name?: string; account_status?: number; currency?: string }[] }>(`${business.id}/owned_ad_accounts`, accessToken, { fields: accountFields, limit: "100" }).catch(() => ({ data: [] })),
      graphRequest<{ data?: { id: string; name?: string; account_status?: number; currency?: string }[] }>(`${business.id}/client_ad_accounts`, accessToken, { fields: accountFields, limit: "100" }).catch(() => ({ data: [] }))
    ]);
    const accounts = new Map<string, MetaAdAccount>();
    for (const account of [...(owned.data ?? []), ...(client.data ?? [])]) accounts.set(account.id, normaliseAccount(account));
    return { id: business.id, name: business.name ?? business.id, accounts: [...accounts.values()] };
  }));

  const assigned = new Set(found.flatMap((business) => business.accounts.map((account) => account.id)));
  const personal = await graphRequest<{ data?: { id: string; name?: string; account_status?: number; currency?: string }[] }>("me/adaccounts", accessToken, { fields: accountFields, limit: "100" });
  const unassigned = (personal.data ?? []).filter((account) => !assigned.has(account.id)).map(normaliseAccount);
  if (unassigned.length) found.push({ id: "personal", name: "Personal ad account access", accounts: unassigned });
  return found;
}

export async function getMetaAdAccount(accessToken: string, accountId: string) {
  return graphRequest<{ id?: string; name?: string }>(accountId, accessToken, { fields: "id,name" });
}

export async function getMetaInsights(accessToken: string, accountId: string) {
  const until = new Date(); const since = new Date(until); since.setDate(since.getDate() - 29);
  const response = await graphRequest<{ data?: Array<{ date_start: string; campaign_id: string; campaign_name?: string; impressions?: string; reach?: string; clicks?: string; spend?: string; ctr?: string; cpc?: string; cpm?: string; actions?: Array<{ action_type?: string; value?: string }> }> }>(`${accountId}/insights`, accessToken, {
    level: "campaign", time_increment: "1", time_range: JSON.stringify({ since: since.toISOString().slice(0, 10), until: until.toISOString().slice(0, 10) }),
    fields: "date_start,campaign_id,campaign_name,impressions,reach,clicks,spend,ctr,cpc,cpm,actions", limit: "500"
  });
  const actionCount = (actions: Array<{ action_type?: string; value?: string }> | undefined, types: string[]) => (actions ?? []).filter((action) => types.includes(action.action_type ?? "")).reduce((total, action) => total + asNumber(action.value), 0);
  return (response.data ?? []).filter((row) => row.date_start && row.campaign_id).map((row) => ({
    date: row.date_start, campaignId: row.campaign_id, campaignName: row.campaign_name ?? row.campaign_id,
    impressions: asNumber(row.impressions), reach: asNumber(row.reach), clicks: asNumber(row.clicks), spend: asNumber(row.spend),
    linkClicks: actionCount(row.actions, ["link_click"]), leads: actionCount(row.actions, ["lead", "onsite_conversion.lead_grouped"]),
    ctr: asNumber(row.ctr), cpc: asNumber(row.cpc), cpm: asNumber(row.cpm), raw: row
  }));
}
