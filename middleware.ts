import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseCredentials, supabaseCookieOptions } from "@/lib/supabase/config";

function redirectWithSessionCookies(request: NextRequest, response: NextResponse, pathname: string) {
  const redirectResponse = NextResponse.redirect(new URL(pathname, request.url));

  response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  ["cache-control", "expires", "pragma"].forEach((header) => {
    const value = response.headers.get(header);
    if (value) redirectResponse.headers.set(header, value);
  });

  return redirectResponse;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  try {
    const { url, anonKey } = getSupabaseCredentials();
    const supabase = createServerClient(url, anonKey, {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          try {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
            Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
          } catch {
            console.error("[auth/middleware] Unable to persist refreshed session cookies.", { cookieCount: cookiesToSet.length });
          }
        }
      }
    });

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.warn("[auth/middleware] Supabase user validation failed.", { status: error.status, errorName: error.name });
    }

    if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
      return redirectWithSessionCookies(request, response, "/auth");
    }

    if (user && request.nextUrl.pathname === "/auth") {
      return redirectWithSessionCookies(request, response, "/dashboard");
    }
  } catch (error) {
    console.error("[auth/middleware] Supabase middleware could not be initialized.", {
      errorName: error instanceof Error ? error.name : "UnknownError"
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
