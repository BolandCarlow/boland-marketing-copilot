import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (oauthError) {
    const destination = new URL("/auth", url.origin);
    destination.searchParams.set("error", oauthError);
    return NextResponse.redirect(destination);
  }
  if (code) {
    const response = NextResponse.redirect(new URL("/dashboard", url.origin));
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { getAll: () => [], setAll: (cookies: any[]) => cookies.forEach(({ name, value, options }: any) => response.cookies.set(name, value, options)) }
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const destination = new URL("/auth", url.origin);
      destination.searchParams.set("error", "We could not verify that sign-in link. Please try again.");
      return NextResponse.redirect(destination);
    }
    return response;
  }
  const destination = new URL("/auth", url.origin);
  destination.searchParams.set("error", "The sign-in link was incomplete. Please request a new one.");
  return NextResponse.redirect(destination);
}
