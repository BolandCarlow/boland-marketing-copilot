import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type Ga4Connection = {
  id: string;
  user_id: string;
  property_id: string;
  refresh_token_ciphertext: string;
  needs_reauth: boolean;
  last_refreshed_at: string | null;
  last_error: string | null;
};

type GoogleTokenResponse = { access_token?: string; error?: string; error_description?: string };

export const ga4PropertyId = () => process.env.GA4_PROPERTY_ID || "259586098";

function tokenEncryptionKey() {
  const value = process.env.GA_TOKEN_ENCRYPTION_KEY;
  if (!value) throw new Error("GA token encryption is not configured.");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("GA token encryption key must be 32 bytes in base64.");
  return key;
}

/**
 * Format: version byte + 12-byte IV + GCM tag + ciphertext, all base64 encoded.
 * This is intentionally compatible with the deployed ga4-scheduled-refresh
 * Edge Function, which rearranges the tag for Web Crypto before decrypting.
 */
export function encryptGa4RefreshToken(refreshToken: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
  return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

function decryptGa4RefreshToken(envelope: string) {
  const raw = Buffer.from(envelope, "base64");
  if (raw.length < 30 || raw[0] !== 1) throw new Error("The stored Google Analytics token is invalid. Reconnect Google Analytics.");
  const decipher = createDecipheriv("aes-256-gcm", tokenEncryptionKey(), raw.subarray(1, 13));
  decipher.setAuthTag(raw.subarray(13, 29));
  return Buffer.concat([decipher.update(raw.subarray(29)), decipher.final()]).toString("utf8");
}

export async function getGa4Connection(userId: string) {
  const { data, error } = await createAdminClient().from("ga4_connections")
    .select("id,user_id,property_id,refresh_token_ciphertext,needs_reauth,last_refreshed_at,last_error")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Google Analytics connection status could not be read.");
  return data as Ga4Connection | null;
}

async function refreshAccessToken(connection: Ga4Connection) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
      refresh_token: decryptGa4RefreshToken(connection.refresh_token_ciphertext),
      grant_type: "refresh_token"
    }),
    cache: "no-store"
  });
  const payload = await response.json().catch(() => ({})) as GoogleTokenResponse;
  if (!response.ok || !payload.access_token) {
    await createAdminClient().from("ga4_connections").update({ needs_reauth: true, last_error: "Google rejected the refresh token. Reconnect Google Analytics." }).eq("id", connection.id);
    throw new Error(payload.error_description || "Google rejected the refresh token. Reconnect Google Analytics.");
  }
  return payload.access_token;
}

export async function testGa4Connection(userId: string) {
  const connection = await getGa4Connection(userId);
  if (!connection) throw new Error("Connect Google Analytics before testing the connection.");
  if (connection.needs_reauth) throw new Error("Google Analytics needs to be reconnected before it can be tested.");
  const accessToken = await refreshAccessToken(connection);
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${connection.property_id}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ dateRanges: [{ startDate: "7daysAgo", endDate: "yesterday" }], metrics: [{ name: "sessions" }], limit: "1" }),
    cache: "no-store"
  });
  if (!response.ok) {
    const detail = await response.text();
    const message = `GA4 API request failed: ${detail.slice(0, 280)}`;
    await createAdminClient().from("ga4_connections").update({ last_error: message }).eq("id", connection.id);
    throw new Error(message);
  }
  await createAdminClient().from("ga4_connections").update({ needs_reauth: false, last_error: null }).eq("id", connection.id);
  return `Connected to GA4 property ${connection.property_id}.`;
}

export async function triggerGa4Sync(userId: string) {
  const connection = await getGa4Connection(userId);
  if (!connection) throw new Error("Connect Google Analytics before syncing.");
  if (connection.needs_reauth) throw new Error("Google Analytics needs to be reconnected before syncing.");
  const secret = process.env.GA4_CRON_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!secret || !url) throw new Error("GA4 sync is not configured on the server.");
  const response = await fetch(`${url}/functions/v1/ga4-scheduled-refresh`, {
    method: "POST", headers: { Authorization: `Bearer ${secret}` }, cache: "no-store"
  });
  const payload = await response.json().catch(() => ({})) as { refreshed?: number; failed?: number; error?: string };
  if (!response.ok) throw new Error(payload.error || "The GA4 refresh function could not be started.");
  if (payload.failed) throw new Error(`GA4 refresh completed with ${payload.failed} failed connection${payload.failed === 1 ? "" : "s"}.`);
  return `GA4 sync completed. ${payload.refreshed ?? 0} connection${payload.refreshed === 1 ? "" : "s"} refreshed.`;
}

export async function disconnectGa4(userId: string) {
  const { error } = await createAdminClient().from("ga4_connections").delete().eq("user_id", userId);
  if (error) throw new Error("Google Analytics could not be disconnected.");
}
