import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { encryptMetaCredential } from "@/lib/meta/crypto";
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
  const state = request.nextUrl.searchParams.get("state"); const code = request.nextUrl.searchParams.get("code");
  if (!state || !code || !equal(request.cookies.get("meta_oauth_state")?.value, state)) return redirect("error", "The Meta OAuth callback could not be verified.");

  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("error", "Your session expired before the Meta callback completed.");
  const { data: connection, error: readError } = await supabase.from("meta_connections").select("id,oauth_state_hash,oauth_state_expires_at").eq("user_id", user.id).maybeSingle();
  if (readError || !connection || connection.oauth_state_expires_at === null || new Date(connection.oauth_state_expires_at).getTime() < Date.now() || !equal(connection.oauth_state_hash ?? undefined, hashMetaOAuthState(state))) {
    return redirect("error", "The Meta OAuth state is invalid or expired. Start the connection again.");
  }

  try {
    const { error } = await supabase.from("meta_connections").update({
      connection_status: "authorization_pending_exchange",
      encrypted_authorization_code: encryptMetaCredential(code),
      oauth_state_hash: null,
      oauth_state_expires_at: null,
      authorization_received_at: new Date().toISOString()
    }).eq("id", connection.id);
    if (error) throw error;
    return redirect("pending", "Meta authorisation was received and encrypted. Token exchange is intentionally disabled until live Meta API calls are approved.");
  } catch (error) {
    return redirect("error", error instanceof Error ? error.message : "Meta authorisation could not be stored.");
  }
}
