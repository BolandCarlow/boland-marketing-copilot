import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseCredentials, supabaseCookieOptions } from "./config";

export const createClient = () => {
  const { url, anonKey } = getSupabaseCredentials();

  return createBrowserClient(url, anonKey, {
    cookieOptions: supabaseCookieOptions
  });
};
