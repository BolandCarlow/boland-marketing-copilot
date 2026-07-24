"use server";

import { revalidatePath } from "next/cache";
import { decryptMetaCredential } from "@/lib/meta/crypto";
import { getMetaAdAccount, getMetaInsights } from "@/lib/meta/graph";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type MetaConnectionActionState = { status: "idle" | "success" | "error"; message: string };
export const initialMetaConnectionActionState: MetaConnectionActionState = { status: "idle", message: "" };
const frequencies = ["hourly", "every_6_hours", "daily", "weekly"] as const;

const revalidateMeta = () => { revalidatePath("/dashboard/settings/integrations"); revalidatePath("/dashboard/settings/integrations/meta-ads"); };

export async function performMetaConnectionAction(_state: MetaConnectionActionState, formData: FormData): Promise<MetaConnectionActionState> {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Your session has expired. Please sign in again." };
  const { data: connection, error } = await supabase.from("meta_connections")
    .select("id,connection_status,encrypted_access_token,ad_account_id").eq("user_id", user.id).maybeSingle();
  if (error || !connection) return { status: "error", message: "Connect Meta before managing this integration." };

  const operation = String(formData.get("operation") ?? "");
  if (operation === "disconnect") {
    const { error: deleteError } = await supabase.from("meta_connections").delete().eq("id", connection.id);
    if (deleteError) return { status: "error", message: "Meta could not be disconnected. Please try again." };
    revalidateMeta(); return { status: "success", message: "Meta has been disconnected." };
  }

  if (operation === "save") {
    const businessManagerId = String(formData.get("businessManagerId") ?? "").trim();
    const businessManagerName = String(formData.get("businessManagerName") ?? "").trim();
    const adAccountId = String(formData.get("adAccountId") ?? "").trim();
    const adAccountName = String(formData.get("adAccountName") ?? "").trim();
    const syncFrequency = String(formData.get("syncFrequency") ?? "daily");
    if (!adAccountId || !adAccountName) return { status: "error", message: "Choose an ad account to finish the Meta connection." };
    if (!frequencies.includes(syncFrequency as (typeof frequencies)[number])) return { status: "error", message: "Choose a valid sync frequency." };
    const { error: updateError } = await supabase.from("meta_connections").update({
      business_manager_id: businessManagerId === "personal" ? null : businessManagerId || null,
      business_manager_name: businessManagerName || null,
      ad_account_id: adAccountId,
      ad_account_name: adAccountName,
      scheduled_sync_enabled: formData.get("scheduledSyncEnabled") === "on",
      sync_frequency: syncFrequency
    }).eq("id", connection.id);
    if (updateError) return { status: "error", message: updateError.message };
    revalidateMeta(); return { status: "success", message: "Meta account and sync preferences saved." };
  }

  if (!connection.encrypted_access_token || !connection.ad_account_id) return { status: "error", message: "Choose an ad account before testing or syncing." };
  const admin = createAdminClient();
  try {
    const token = decryptMetaCredential(connection.encrypted_access_token);
    if (operation === "test") {
      const account = await getMetaAdAccount(token, connection.ad_account_id);
      if (!account.id) throw new Error("Meta could not verify the selected ad account.");
      await admin.from("meta_connections").update({ last_tested_at: new Date().toISOString(), last_test_status: "succeeded", last_refresh_error: null }).eq("id", connection.id);
      revalidateMeta(); return { status: "success", message: `Connected to ${account.name ?? connection.ad_account_id}.` };
    }
    if (operation === "sync") {
      const records = await getMetaInsights(token, connection.ad_account_id);
      const now = new Date().toISOString();
      const { error: snapshotError } = await admin.from("meta_snapshots").upsert({
        connection_id: connection.id, user_id: user.id, snapshot_date: now.slice(0, 10), status: "succeeded",
        payload: { source: "manual", accountId: connection.ad_account_id, records }, error_message: null
      }, { onConflict: "connection_id,snapshot_date" });
      if (snapshotError) throw snapshotError;
      await admin.from("meta_connections").update({ last_sync_at: now, last_sync_status: "succeeded", last_refresh_error: null }).eq("id", connection.id);
      revalidateMeta(); return { status: "success", message: `Synced ${records.length} Meta campaign-day records.` };
    }
    return { status: "error", message: "Unknown Meta connection action." };
  } catch (exception) {
    const message = exception instanceof Error ? exception.message : "Meta Ads action failed.";
    const statusColumn = operation === "test" ? { last_tested_at: new Date().toISOString(), last_test_status: "failed" } : operation === "sync" ? { last_sync_at: new Date().toISOString(), last_sync_status: "failed" } : {};
    await admin.from("meta_connections").update({ ...statusColumn, last_refresh_error: message.slice(0, 500) }).eq("id", connection.id);
    revalidateMeta(); return { status: "error", message };
  }
}
