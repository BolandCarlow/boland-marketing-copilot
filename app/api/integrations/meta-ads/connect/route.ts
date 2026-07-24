import { NextRequest, NextResponse } from "next/server";
import { createMetaOAuthState, hashMetaOAuthState, metaAuthorizationUrl } from "@/lib/meta/oauth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  try {
    const state = createMetaOAuthState();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error } = await supabase.from("meta_connections").upsert({
      user_id: user.id,
      connection_status: "authorization_pending",
      oauth_state_hash: hashMetaOAuthState(state),
      oauth_state_expires_at: expiresAt,
      encrypted_authorization_code: null,
      last_refresh_error: null
    }, { onConflict: "user_id" });
    if (error) throw new Error(error.code === "42P01" ? "Apply the Meta OAuth migration before connecting." : error.message);

    const authorization = metaAuthorizationUrl();
    authorization.searchParams.set("state", state);
    const response = NextResponse.redirect(authorization);
    response.cookies.set("meta_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
    return response;
  } catch (error) {
    return NextResponse.redirect(new URL(`/dashboard/settings/integrations/meta-ads?status=error&message=${encodeURIComponent(error instanceof Error ? error.message : "Meta OAuth could not start.")}`, request.url));
  }
}
