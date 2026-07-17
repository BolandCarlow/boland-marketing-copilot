"use server";

import { revalidatePath } from "next/cache";
import { getNextScheduledRun } from "@/lib/integrations/orchestrator";
import { createClient } from "@/lib/supabase/server";

export type MetaAccountActionState = { status: "idle" | "success" | "error"; message: string };

export async function saveMetaAdAccount(_state: MetaAccountActionState, formData: FormData): Promise<MetaAccountActionState> {
  const accountIdentifier = String(formData.get("accountIdentifier") ?? "").trim();
  const scheduled = formData.get("scheduledSyncEnabled") === "on";
  if (!/^act_\d+$/.test(accountIdentifier)) return { status: "error", message: "Choose a valid Meta ad account." };
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Your session has expired. Please sign in again." };
  const existing = await supabase.from("integration_settings").select("encrypted_credentials,configuration").eq("user_id", user.id).eq("provider", "meta-ads").maybeSingle();
  if (existing.error) return { status: "error", message: "Meta Ads settings could not be updated." };
  if (!existing.data?.encrypted_credentials) return { status: "error", message: "Connect Meta Ads before choosing an ad account." };
  const { error } = await supabase.from("integration_settings").upsert({
    user_id: user.id, provider: "meta-ads", is_enabled: true, authentication_type: "oauth", account_identifier: accountIdentifier,
    encrypted_credentials: existing.data.encrypted_credentials, configuration: existing.data.configuration ?? {}, connection_status: "configured",
    scheduled_sync_enabled: scheduled, sync_frequency: "daily", next_scheduled_sync_at: scheduled ? getNextScheduledRun("daily") : null, updated_at: new Date().toISOString()
  }, { onConflict: "user_id,provider" });
  if (error) return { status: "error", message: "Meta Ads settings could not be saved." };
  revalidatePath("/dashboard/settings/integrations"); revalidatePath("/dashboard/settings/integrations/meta-ads");
  return { status: "success", message: scheduled ? "Boland Carlow is selected. Daily sync is enabled." : "Boland Carlow is selected. You can sync manually at any time." };
}
