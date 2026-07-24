import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { encryptMetaCredential } from "@/lib/meta/crypto";
import { discoverMetaBusinesses, exchangeMetaOAuthCode } from "@/lib/meta/graph";
import { hashMetaOAuthState } from "@/lib/meta/oauth";
import { createClient } from "@/lib/supabase/server";

function equal(left: string | undefined, right: string | null) {
  if (!left || !right) return false;
  const first = Buffer.from(left); const second = Buffer.from(right);
  return first.length === second.length && timingSafeEqual(first, second);
}

export async function GET(request: NextRequest) {
  const destination = new URL("/dashboard/settings/integrations/meta-ads", request.url);
  const redirect = (status: string, message: string) => { destination.searchParams.set("status", status); destination.searchParams.set("message", message); const response = NextResponse.redirect(destination); response.cookies.set("meta_oauth_state", "", { httpOnly: true, path: "/", maxAge: 0 }); return response; };
  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError) return redirect("error", providerError === "access_denied" ? "Meta access was not granted. No connection was made." : "Meta authorisation was cancelled or failed.");
  const state = request.nextUrl.searchParams.get("state"); const code = request.nextUrl.searchParams.get("code");
  if (!state || !code || !equal(request.cookies.get("meta_oauth_state")?.value, state)) return redirect("error", "The Meta OAuth callback could not be verified.");

  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("error", "Your session expired before the Meta callback completed.");
  const { data: connection, error: readError } = await supabase.from("meta_connections").select("id,oauth_state_hash,oauth_state_expires_at").eq("user_id", user.id).maybeSingle();
  if (readError || !connection || connection.oauth_state_expires_at === null || new Date(connection.oauth_state_expires_at).getTime() < Date.now() || !equal(connection.oauth_state_hash ?? undefined, hashMetaOAuthState(state))) {
    return redirect("error", "The Meta OAuth state is invalid or expired. Start the connection again.");
  }

  try {
    const token = await exchangeMetaOAuthCode(code);
    const businesses = await discoverMetaBusinesses(token.accessToken);
    const selectedBusiness = businesses.length === 1 ? businesses[0] : null;
    const selectedAccount = selectedBusiness?.accounts.length === 1 ? selectedBusiness.accounts[0] : null;
    const { error } = await supabase.from("meta_connections").update({
      connection_status: "connected",
      encrypted_authorization_code: null,
      encrypted_access_token: encryptMetaCredential(token.accessToken),
      encrypted_refresh_token: null,
      token_expires_at: token.expiresAt,
      business_manager_id: selectedBusiness?.id === "personal" ? null : selectedBusiness?.id ?? null,
      business_manager_name: selectedBusiness?.name ?? null,
      ad_account_id: selectedAccount?.id ?? null,
      ad_account_name: selectedAccount?.name ?? null,
      oauth_state_hash: null,
      oauth_state_expires_at: null,
      authorization_received_at: new Date().toISOString(),
      last_refresh_error: null
    }).eq("id", connection.id);
    if (error) throw error;
    const message = businesses.length === 1
      ? selectedAccount ? "Meta connected. Your Business Manager and only available ad account were selected." : "Meta connected. Select an ad account to finish setup."
      : businesses.length ? "Meta connected. Select a Business Manager and ad account to finish setup." : "Meta connected, but no accessible Business Managers or ad accounts were found.";
    return redirect("connected", message);
  } catch (error) {
    return redirect("error", error instanceof Error ? error.message : "Meta authorisation could not be stored.");
  }
}
