import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies: any[]) => {
          try {
            cookies.forEach(({ name, value, options }: any) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot write cookies; middleware refreshes sessions.
          }
        }
      }
    }
  );
}

