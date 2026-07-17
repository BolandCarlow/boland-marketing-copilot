import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { APP_ORIGIN, getSupabaseCredentials, supabaseCookieOptions } from "@/lib/supabase/config";

const CALLBACK_ERROR = "We could not complete your sign-in. Please request a new link and try again.";

function authErrorUrl(message: string) {
  const destination = new URL("/auth", APP_ORIGIN);
  destination.searchParams.set("error", message);
  return destination;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (oauthError) {
    console.warn("[auth/callback] Supabase returned an OAuth callback error.", { hasProviderError: true });
    return NextResponse.redirect(authErrorUrl(CALLBACK_ERROR));
  }

  if (!code) {
    console.warn("[auth/callback] Callback request did not include an authorization code.");
    return NextResponse.redirect(authErrorUrl("The sign-in link was incomplete. Please request a new one."));
  }

  const response = NextResponse.redirect(new URL("/dashboard", APP_ORIGIN));
  response.headers.set("Cache-Control", "private, no-store");
  let cookieWriteFailed = false;

  try {
    const { url: supabaseUrl, anonKey } = getSupabaseCredentials();
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        // The PKCE verifier is stored in a cookie before Google or email sends
        // the user back here, so the exchange must receive the request cookies.
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
            Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
          } catch {
            cookieWriteFailed = true;
            console.error("[auth/callback] Unable to persist the exchanged session cookies.", { cookieCount: cookiesToSet.length });
          }
        }
      }
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || cookieWriteFailed) {
      console.error("[auth/callback] Session exchange failed.", {
        exchangeFailed: Boolean(error),
        cookieWriteFailed,
        status: error?.status,
        errorName: error?.name
      });
      response.headers.set("Location", authErrorUrl(CALLBACK_ERROR).toString());
    }
  } catch (error) {
    console.error("[auth/callback] Session exchange could not be initialized.", {
      errorName: error instanceof Error ? error.name : "UnknownError"
    });
    response.headers.set("Location", authErrorUrl(CALLBACK_ERROR).toString());
  }

  return response;
}
