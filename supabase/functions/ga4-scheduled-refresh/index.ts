// Deploy with: supabase functions deploy ga4-scheduled-refresh --no-verify-jwt
// This endpoint rejects all calls except the pg_cron job carrying GA4_CRON_SECRET.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const propertyMetrics = ["activeUsers", "sessions", "newUsers", "engagedSessions", "keyEvents"];
const bytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const text = new TextDecoder();

async function decrypt(envelope: string) {
  const raw = bytes(envelope);
  if (raw[0] !== 1) throw new Error("Unknown token envelope");
  const key = await crypto.subtle.importKey("raw", bytes(Deno.env.get("GA_TOKEN_ENCRYPTION_KEY")!), "AES-GCM", false, ["decrypt"]);
  // Node's envelope stores GCM's tag before its ciphertext; Web Crypto expects it appended.
  const encrypted = new Uint8Array(raw.length - 13);
  encrypted.set(raw.slice(29));
  encrypted.set(raw.slice(13, 29), raw.length - 29);
  return text.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(1, 13), tagLength: 128 }, key, encrypted));
}

const report = (dimensions: string[], metrics: string[], startDate: string, endDate: string, limit = 10) => ({
  dateRanges: [{ startDate, endDate }], dimensions: dimensions.map((name) => ({ name })), metrics: metrics.map((name) => ({ name })), limit: String(limit),
  orderBys: dimensions[0] === "date" ? [{ dimension: { dimensionName: "date" } }] : [{ metric: { metricName: metrics[0] }, desc: true }],
});
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
function completeMonths() {
  const now = new Date();
  const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(thisMonth.getUTCFullYear(), thisMonth.getUTCMonth() - 1, 1));
  const previousMonthStart = new Date(Date.UTC(thisMonth.getUTCFullYear(), thisMonth.getUTCMonth() - 2, 1));
  return { lastMonth: [isoDate(lastMonthStart), isoDate(new Date(thisMonth.getTime() - 86_400_000))], previousMonth: [isoDate(previousMonthStart), isoDate(new Date(lastMonthStart.getTime() - 86_400_000))] } as const;
}

Deno.serve(async (request) => {
  if (request.headers.get("authorization") !== `Bearer ${Deno.env.get("GA4_CRON_SECRET")}`) return new Response("Unauthorized", { status: 401 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: connections, error } = await db.from("ga4_connections").select("id,user_id,property_id,refresh_token_ciphertext").eq("needs_reauth", false);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const results = await Promise.allSettled((connections ?? []).map(async (connection) => {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!, client_secret: Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!, refresh_token: await decrypt(connection.refresh_token_ciphertext), grant_type: "refresh_token" }) });
    if (!tokenResponse.ok) { await db.from("ga4_connections").update({ needs_reauth: true, last_error: "Google rejected the refresh token" }).eq("id", connection.id); throw new Error(`Refresh rejected for ${connection.id}`); }
    const { access_token } = await tokenResponse.json();
    const months = completeMonths();
    const reportResponse = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${connection.property_id}:batchRunReports`, { method: "POST", headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ requests: [report([], propertyMetrics, "30daysAgo", "yesterday", 1), report(["sessionDefaultChannelGroup"], ["sessions", "activeUsers", "keyEvents"], "30daysAgo", "yesterday"), report(["deviceCategory"], ["sessions", "activeUsers", "keyEvents"], "30daysAgo", "yesterday"), report(["landingPagePlusQueryString"], ["sessions", "engagedSessions", "keyEvents"], "30daysAgo", "yesterday", 20), report(["date"], propertyMetrics, "30daysAgo", "yesterday", 31), report([], propertyMetrics, ...months.lastMonth, 1), report([], propertyMetrics, ...months.previousMonth, 1)] }) });
    if (!reportResponse.ok) throw new Error(`GA4 report failed: ${await reportResponse.text()}`);
    await db.from("ga4_snapshots").insert({ user_id: connection.user_id, connection_id: connection.id, property_id: connection.property_id, payload: { generatedAt: new Date().toISOString(), reports: (await reportResponse.json()).reports } });
    await db.from("ga4_connections").update({ last_refreshed_at: new Date().toISOString(), last_error: null }).eq("id", connection.id);
  }));
  return Response.json({ refreshed: results.filter((r) => r.status === "fulfilled").length, failed: results.filter((r) => r.status === "rejected").length });
});
