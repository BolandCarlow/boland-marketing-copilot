import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const response = NextResponse.redirect(new URL("/dashboard", url.origin));
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { getAll: () => [], setAll: (cookies: any[]) => cookies.forEach(({ name, value, options }: any) => response.cookies.set(name, value, options)) }
    });
    await supabase.auth.exchangeCodeForSession(code);
    return response;
  }
  return NextResponse.redirect(new URL("/auth", url.origin));
}
