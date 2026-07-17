import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseCredentials, supabaseCookieOptions } from "./config";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseCredentials();

  return createServerClient(
    url,
    anonKey,
    {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot write cookies; middleware refreshes sessions.
          }
        }
      }
    }
  );
}
