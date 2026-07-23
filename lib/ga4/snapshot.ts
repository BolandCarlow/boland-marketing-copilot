import "server-only";
import type { Ga4Snapshot } from "./dashboard";
import { createClient } from "@/lib/supabase/server";

export async function getLatestGa4Snapshot() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { snapshot: null, error: "Your session has expired." };
  const { data, error } = await supabase.from("ga4_snapshots").select("generated_at,property_id,payload").eq("user_id", user.id).order("generated_at", { ascending: false }).limit(1).maybeSingle();
  return { snapshot: data as Ga4Snapshot | null, error: error?.message ?? null };
}
