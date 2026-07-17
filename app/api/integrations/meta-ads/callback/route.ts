import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { encryptCredential } from "@/lib/data-platform/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const appId = () => process.env.META_APP_ID || "1807324450433396";
const redirectUri = () => process.env.META_ADS_REDIRECT_URI || "https://boland-marketing-copilot.vercel.app/api/integrations/meta-ads/callback";
const graphVersion = () => process.env.META_GRAPH_API_VERSION || "v23.0";
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "https://boland-marketing-copilot.vercel.app";

function safeStateEqual(left: string | undefined, right: string | null) {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left); const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function exchangeCode(code: string) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) throw new Error("META_APP_SECRET is not configured.");
  const initial = new URL(`https://graph.facebook.com/${graphVersion()}/oauth/access_token`);
  initial.search = new URLSearchParams({ client_id: appId(), client_secret: appSecret, redirect_uri: redirectUri(), code }).toString();
  const initialResponse = await fetch(initial, { cache: "no-store" });
  const initialPayload = await initialResponse.json().catch(() => ({})) as { access_token?: string; error?: { message?: string } };
  if (!initialResponse.ok || !initialPayload.access_token) throw new Error(initialPayload.error?.message || "Meta did not return an access token.");

  const extended = new URL(`https://graph.facebook.com/${graphVersion()}/oauth/access_token`);
  extended.search = new URLSearchParams({ grant_type: "fb_exchange_token", client_id: appId(), client_secret: appSecret, fb_exchange_token: initialPayload.access_token }).toString();
  const extendedResponse = await fetch(extended, { cache: "no-store" });
  const extendedPayload = await extendedResponse.json().catch(() => ({})) as { access_token?: string; expires_in?: number; error?: { message?: string } };
  if (!extendedResponse.ok || !extendedPayload.access_token) throw new Error(extendedPayload.error?.message || "Meta could not create a long-lived access token.");
  return { accessToken: extendedPayload.access_token, expiresAt: extendedPayload.expires_in ? new Date(Date.now() + extendedPayload.expires_in * 1000).toISOString() : null };
}

export async function GET(request: NextRequest) {
  const destination = new URL("/dashboard/settings/integrations/meta-ads", appUrl());
  const state = request.nextUrl.searchParams.get("state"); const code = request.nextUrl.searchParams.get("code");
  const response = (status: string, message?: string) => { destination.searchParams.set("status", status); if (message) destination.searchParams.set("message", message); const redirect = NextResponse.redirect(destination); redirect.cookies.set("meta_oauth_state", "", { httpOnly: true, path: "/", maxAge: 0 }); return redirect; };
  if (!safeStateEqual(request.cookies.get("meta_oauth_state")?.value, state) || !code) return response("error", "The Meta connection could not be verified. Please try again.");

  try {
    const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
    if (!user) return response("error", "Your session expired before Meta could be connected. Please sign in and try again.");
    const credential = await exchangeCode(code);
    const admin = createAdminClient();
    const existing = await admin.from("integration_settings").select("configuration,account_identifier").eq("user_id", user.id).eq("provider", "meta-ads").maybeSingle();
    if (existing.error) throw existing.error;
    const saved = await admin.from("integration_settings").upsert({
      user_id: user.id, provider: "meta-ads", is_enabled: true, authentication_type: "oauth",
      account_identifier: existing.data?.account_identifier ?? null, configuration: existing.data?.configuration ?? {},
      encrypted_credentials: encryptCredential(JSON.stringify(credential)), connection_status: "configured", updated_at: new Date().toISOString()
    }, { onConflict: "user_id,provider" });
    if (saved.error) throw saved.error;
    return response("connected", "Meta is authorised. Choose the Boland Carlow ad account to complete setup.");
  } catch (error) {
    return response("error", error instanceof Error ? error.message.slice(0, 240) : "Meta Ads could not be connected.");
  }
}
