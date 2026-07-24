"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MetaConnectionSettingsState = { status: "idle" | "success" | "error"; message: string };
export const initialMetaConnectionSettingsState: MetaConnectionSettingsState = { status: "idle", message: "" };

export async function saveMetaConnectionSettings(_state: MetaConnectionSettingsState, formData: FormData): Promise<MetaConnectionSettingsState> {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Your session has expired. Please sign in again." };
  const scheduled = formData.get("scheduledSyncEnabled") === "on";
  const { data: existing, error: readError } = await supabase.from("meta_connections").select("id").eq("user_id", user.id).maybeSingle();
  if (readError && readError.code !== "PGRST116") return { status: "error", message: readError.code === "42P01" ? "Apply the Meta OAuth migration before saving settings." : readError.message };
  if (!existing) return { status: "error", message: "Start the Meta OAuth connection before enabling a schedule." };
  const { error } = await supabase.from("meta_connections").update({ scheduled_sync_enabled: scheduled }).eq("id", existing.id);
  if (error) return { status: "error", message: error.message };
  revalidatePath("/dashboard/settings/integrations/meta-ads");
  return { status: "success", message: scheduled ? "The Meta scheduler is enabled. It records a pending snapshot only; no Meta API calls are made." : "The Meta scheduler is disabled." };
}
