import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const appId = () => process.env.META_APP_ID || "1807324450433396";
const redirectUri = () => process.env.META_ADS_REDIRECT_URI || "https://boland-marketing-copilot.vercel.app/api/integrations/meta-ads/callback";
const graphVersion = () => process.env.META_GRAPH_API_VERSION || "v23.0";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const state = randomBytes(32).toString("base64url");
  const authorization = new URL(`https://www.facebook.com/${graphVersion()}/dialog/oauth`);
  authorization.searchParams.set("client_id", appId());
  authorization.searchParams.set("redirect_uri", redirectUri());
  authorization.searchParams.set("state", state);
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("scope", "ads_read,read_insights");

  const response = NextResponse.redirect(authorization);
  response.cookies.set("meta_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 600 });
  return response;
}
