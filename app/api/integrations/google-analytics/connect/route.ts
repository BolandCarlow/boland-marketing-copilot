import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const callbackUrl = () => process.env.GOOGLE_ANALYTICS_REDIRECT_URI || "https://boland-marketing-copilot.vercel.app/api/integrations/google-analytics/callback";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/auth?error=Please+sign+in+before+connecting+Google+Analytics.", request.url));
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL("/dashboard/settings/integrations?ga4_status=error&ga4_message=Google+Analytics+OAuth+is+not+configured.", request.url));

  const state = randomBytes(32).toString("base64url");
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.searchParams.set("client_id", clientId);
  authorization.searchParams.set("redirect_uri", callbackUrl());
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("scope", "https://www.googleapis.com/auth/analytics.readonly");
  authorization.searchParams.set("access_type", "offline");
  authorization.searchParams.set("prompt", "consent");
  authorization.searchParams.set("state", state);

  const response = NextResponse.redirect(authorization);
  response.cookies.set("ga4_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
  return response;
}
