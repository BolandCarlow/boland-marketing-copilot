/**
 * Authentication must always complete on the canonical production host. This
 * keeps the PKCE verifier and the returned Supabase session on the same host.
 */
export const APP_ORIGIN = "https://boland-marketing-copilot.vercel.app";
export const AUTH_CALLBACK_URL = `${APP_ORIGIN}/auth/callback`;

// Keep browser, middleware and server clients on the same cookie settings.
export const supabaseCookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production"
};

export function getSupabaseCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return { url, anonKey };
}
