import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { encryptGa4RefreshToken, ga4PropertyId } from "@/lib/integrations/google-analytics";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const callbackUrl = () => process.env.GOOGLE_ANALYTICS_REDIRECT_URI || "https://boland-marketing-copilot.vercel.app/api/integrations/google-analytics/callback";
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "https://boland-marketing-copilot.vercel.app";

function matchingState(left: string | undefined, right: string | null) {
  if (!left || !right) return false;
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  const destination = new URL("/dashboard/settings/integrations", appUrl());
  const finish = (status: "connected" | "error", message: string) => {
    destination.searchParams.set("ga4_status", status); destination.searchParams.set("ga4_message", message);
    const response = NextResponse.redirect(destination);
    response.cookies.set("ga4_oauth_state", "", { httpOnly: true, path: "/", maxAge: 0 });
    return response;
  };
  const error = request.nextUrl.searchParams.get("error");
  if (error) return finish("error", error === "access_denied" ? "Google Analytics access was not granted. No connection was made." : "Google Analytics authorisation was cancelled or failed.");
  const state = request.nextUrl.searchParams.get("state"); const code = request.nextUrl.searchParams.get("code");
  if (!matchingState(request.cookies.get("ga4_oauth_state")?.value, state)) return finish("error", "The Google Analytics connection could not be verified. Please try again.");
  if (!code) return finish("error", "Google did not return an authorisation code. Please try again.");

  try {
    const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
    if (!user) return finish("error", "Your session expired before Google Analytics could be connected. Please sign in and try again.");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "", client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "", code, grant_type: "authorization_code", redirect_uri: callbackUrl() }), cache: "no-store"
    });
    const token = await tokenResponse.json().catch(() => ({})) as { refresh_token?: string; error_description?: string };
    if (!tokenResponse.ok || !token.refresh_token) throw new Error(token.error_description || "Google did not return a refresh token. Please reconnect and grant consent.");
    const { error: saveError } = await createAdminClient().from("ga4_connections").upsert({
      user_id: user.id, property_id: ga4PropertyId(), refresh_token_ciphertext: encryptGa4RefreshToken(token.refresh_token), needs_reauth: false, last_error: null
    }, { onConflict: "user_id,property_id" });
    if (saveError) throw saveError;
    return finish("connected", `Google Analytics is connected to property ${ga4PropertyId()}.`);
  } catch (exception) {
    const message = exception && typeof exception === "object" && "message" in exception && typeof exception.message === "string"
      ? exception.message
      : exception instanceof Error ? exception.message : "Google Analytics could not be connected.";
    return finish("error", message.slice(0, 300));
  }
}
