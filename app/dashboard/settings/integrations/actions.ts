"use server";

import { revalidatePath } from "next/cache";
import { encryptCredential } from "@/lib/data-platform/security";
import { getProvider, isAuthenticationType, isProviderId } from "@/lib/data-platform/providers";
import { createClient } from "@/lib/supabase/server";
import { getNextScheduledRun, requestManualSync, testIntegration } from "@/lib/integrations/orchestrator";

export type IntegrationActionState = { status: "idle" | "success" | "error"; message: string };
const frequencies = ["hourly", "every_6_hours", "daily", "weekly"] as const;

export async function performIntegrationAction(_state: IntegrationActionState, formData: FormData): Promise<IntegrationActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Your session has expired. Please sign in again." };

  const provider = String(formData.get("provider") ?? "");
  const operation = String(formData.get("operation") ?? "save");
  if (!isProviderId(provider)) return { status: "error", message: "Unknown integration." };

  try {
    if (operation === "test") {
      const result = await testIntegration(user.id, provider);
      revalidatePath("/dashboard/settings/integrations");
      return { status: result.configurationValid ? "success" : "error", message: result.message };
    }
    if (operation === "sync") {
      const result = await requestManualSync(user.id, provider);
      revalidatePath("/dashboard/settings/integrations");
      return { status: result.status === "failed" ? "error" : "success", message: result.message };
    }
    if (operation !== "save") return { status: "error", message: "Unknown integration action." };

    const definition = getProvider(provider)!;
    const accountIdentifier = String(formData.get("accountIdentifier") ?? "").trim();
    const credentials = String(formData.get("credentials") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    const authenticationType = String(formData.get("authenticationType") ?? definition.defaultAuthenticationType);
    const syncFrequency = String(formData.get("syncFrequency") ?? "daily") as (typeof frequencies)[number];
    const scheduledSyncEnabled = formData.get("scheduledSyncEnabled") === "on";

    if (!isAuthenticationType(authenticationType) || !definition.authenticationTypes.includes(authenticationType)) {
      return { status: "error", message: "Choose a supported authentication method." };
    }
    if (!frequencies.includes(syncFrequency)) return { status: "error", message: "Choose a valid sync frequency." };
    if (accountIdentifier.length > 250 || notes.length > 1000 || credentials.length > 100_000) {
      return { status: "error", message: "One or more settings exceed the allowed length." };
    }

    const existing = await supabase.from("integration_settings")
      .select("encrypted_credentials")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .maybeSingle();
    if (existing.error) throw existing.error;

    let encryptedCredentials = existing.data?.encrypted_credentials ?? null;
    if (credentials) encryptedCredentials = encryptCredential(credentials);
    const configured = Boolean(accountIdentifier && encryptedCredentials);
    const { error } = await supabase.from("integration_settings").upsert({
      user_id: user.id,
      provider,
      is_enabled: configured,
      account_identifier: accountIdentifier || null,
      configuration: { notes },
      encrypted_credentials: encryptedCredentials,
      authentication_type: authenticationType,
      connection_status: configured ? "configured" : "not_connected",
      scheduled_sync_enabled: scheduledSyncEnabled,
      sync_frequency: syncFrequency,
      next_scheduled_sync_at: scheduledSyncEnabled ? getNextScheduledRun(syncFrequency) : null,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id,provider" });
    if (error) throw error;

    revalidatePath("/dashboard/settings/integrations");
    return { status: "success", message: "Integration settings saved securely. No live connection was attempted." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Integration action failed." };
  }
}
