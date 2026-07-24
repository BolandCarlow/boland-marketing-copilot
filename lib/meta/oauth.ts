import "server-only";
import { createHash, randomBytes } from "node:crypto";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function metaOAuthConfiguration() {
  return {
    appId: required("META_APP_ID"),
    appSecret: required("META_APP_SECRET"),
    redirectUri: required("META_OAUTH_REDIRECT_URI"),
    graphVersion: process.env.META_GRAPH_API_VERSION?.trim() || "v23.0",
    scopes: process.env.META_OAUTH_SCOPES?.trim() || "ads_read,read_insights,business_management"
  };
}

export function createMetaOAuthState() { return randomBytes(32).toString("base64url"); }
export function hashMetaOAuthState(state: string) { return createHash("sha256").update(state).digest("hex"); }

export function metaAuthorizationUrl() {
  const config = metaOAuthConfiguration();
  const url = new URL(`https://www.facebook.com/${config.graphVersion}/dialog/oauth`);
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes);
  return url;
}
