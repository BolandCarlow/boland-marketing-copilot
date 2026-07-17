import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProviderId } from "@/lib/data-platform/providers";
import { getIntegrationAdapter, type IntegrationConfiguration } from "./adapter-registry";
import { syncProviderRecords } from "@/lib/data-platform/sync-service";

type Setting = {
  id: string;
  user_id: string;
  provider: ProviderId;
  account_identifier: string | null;
  encrypted_credentials: string | null;
  authentication_type: string;
  sync_frequency: "hourly" | "every_6_hours" | "daily" | "weekly";
};

function configuration(setting: Setting): IntegrationConfiguration {
  return {
    accountIdentifier: setting.account_identifier,
    hasCredentials: Boolean(setting.encrypted_credentials),
    authenticationType: setting.authentication_type,
    encryptedCredentials: setting.encrypted_credentials
  };
}

function nextRun(frequency: Setting["sync_frequency"], from = new Date()) {
  const hours = frequency === "hourly" ? 1 : frequency === "every_6_hours" ? 6 : frequency === "weekly" ? 168 : 24;
  return new Date(from.getTime() + hours * 60 * 60 * 1000).toISOString();
}

async function getSetting(userId: string, provider: ProviderId) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("integration_settings")
    .select("id,user_id,provider,account_identifier,encrypted_credentials,authentication_type,sync_frequency")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw error;
  return data as Setting | null;
}

export async function testIntegration(userId: string, provider: ProviderId) {
  const admin = createAdminClient();
  const setting = await getSetting(userId, provider);
  const adapter = getIntegrationAdapter(provider);
  const result = await adapter.testConnection(setting ? configuration(setting) : {
    accountIdentifier: null,
    hasCredentials: false,
    authenticationType: "api_key",
    encryptedCredentials: null
  });
  const now = new Date().toISOString();

  if (setting) {
    const { error } = await admin.from("integration_settings").update({
      last_tested_at: now,
      test_status: result.ok ? "connected" : result.configurationValid ? "failed" : "missing_configuration",
      connection_status: result.ok ? "connected" : result.configurationValid ? "error" : "not_connected",
      updated_at: now
    }).eq("id", setting.id);
    if (error) throw error;
  }

  const { error: historyError } = await admin.from("integration_sync_history").insert({
    user_id: userId,
    integration_setting_id: setting?.id ?? null,
    provider,
    trigger_type: "connection_test",
    status: result.liveConnectionAttempted && result.ok ? "success" : "skipped",
    completed_at: now,
    details: {
      configurationValid: result.configurationValid,
      liveConnectionAttempted: result.liveConnectionAttempted,
      message: result.message
    }
  });
  if (historyError) throw historyError;
  return result;
}

export async function requestManualSync(userId: string, provider: ProviderId) {
  const admin = createAdminClient();
  const setting = await getSetting(userId, provider);
  const adapter = getIntegrationAdapter(provider);
  let result = await adapter.sync(setting ? configuration(setting) : {
    accountIdentifier: null,
    hasCredentials: false,
    authenticationType: "api_key",
    encryptedCredentials: null
  });
  let recordsProcessed = result.recordsProcessed;
  if (result.status === "success" && result.records?.length) {
    try { recordsProcessed = await syncProviderRecords(provider, result.records); }
    catch (error) { result = { ...result, status: "failed", message: error instanceof Error ? error.message : "Integration data could not be stored." }; }
  }
  const now = new Date().toISOString();
  const { data: history, error } = await admin.from("integration_sync_history").insert({
    user_id: userId,
    integration_setting_id: setting?.id ?? null,
    provider,
    trigger_type: "manual",
    status: result.status,
    records_received: result.recordsReceived,
    records_processed: recordsProcessed,
    completed_at: now,
    error_message: result.status === "failed" ? result.message : null,
    details: { liveConnectionAttempted: result.liveConnectionAttempted, message: result.message }
  }).select("id").single();
  if (error) throw error;
  if (result.status === "failed") {
    const logged = await admin.from("integration_error_logs").insert({
      user_id: userId,
      integration_setting_id: setting?.id ?? null,
      sync_history_id: history.id,
      provider,
      error_code: "MANUAL_SYNC_FAILED",
      message: result.message,
      context: { liveConnectionAttempted: result.liveConnectionAttempted }
    });
    if (logged.error) throw logged.error;
  }
  if (setting && result.liveConnectionAttempted && result.status !== "skipped") {
    const updated = await admin.from("integration_settings").update({
      last_sync_at: now,
      last_sync_status: result.status,
      last_error: result.status === "failed" ? result.message : null,
      connection_status: result.status === "success" ? "connected" : "error",
      updated_at: now
    }).eq("id", setting.id);
    if (updated.error) throw updated.error;
  }
  return result;
}

export async function runDueScheduledIntegrations(limit = 25) {
  const admin = createAdminClient();
  const now = new Date();
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const { data, error } = await admin.from("integration_settings")
    .select("id,user_id,provider,account_identifier,encrypted_credentials,authentication_type,sync_frequency")
    .eq("scheduled_sync_enabled", true)
    .lte("next_scheduled_sync_at", now.toISOString())
    .order("next_scheduled_sync_at", { ascending: true })
    .limit(safeLimit);
  if (error) throw error;

  const results = [];
  for (const row of (data ?? []) as Setting[]) {
    const adapter = getIntegrationAdapter(row.provider);
    let result = await adapter.sync(configuration(row));
    let recordsProcessed = result.recordsProcessed;
    if (result.status === "success" && result.records?.length) {
      try { recordsProcessed = await syncProviderRecords(row.provider, result.records); }
      catch (error) { result = { ...result, status: "failed", message: error instanceof Error ? error.message : "Integration data could not be stored." }; }
    }
    const completedAt = new Date().toISOString();
    const history = await admin.from("integration_sync_history").insert({
      user_id: row.user_id,
      integration_setting_id: row.id,
      provider: row.provider,
      trigger_type: "scheduled",
      status: result.status,
      records_received: result.recordsReceived,
      records_processed: recordsProcessed,
      completed_at: completedAt,
      error_message: result.status === "failed" ? result.message : null,
      details: { liveConnectionAttempted: result.liveConnectionAttempted, message: result.message }
    }).select("id").single();
    if (history.error) throw history.error;
    if (result.status === "failed") {
      const logged = await admin.from("integration_error_logs").insert({
        user_id: row.user_id,
        integration_setting_id: row.id,
        sync_history_id: history.data.id,
        provider: row.provider,
        error_code: "SCHEDULED_SYNC_FAILED",
        message: result.message,
        context: { liveConnectionAttempted: result.liveConnectionAttempted }
      });
      if (logged.error) throw logged.error;
    }
    const updated = await admin.from("integration_settings").update({
      next_scheduled_sync_at: nextRun(row.sync_frequency, now),
      ...(result.liveConnectionAttempted && result.status !== "skipped" ? {
        last_sync_at: completedAt,
        last_sync_status: result.status,
        last_error: result.status === "failed" ? result.message : null,
        connection_status: result.status === "success" ? "connected" : "error"
      } : {}),
      updated_at: completedAt
    }).eq("id", row.id);
    if (updated.error) throw updated.error;
    results.push({ provider: row.provider, status: result.status });
  }
  return results;
}

export function getNextScheduledRun(frequency: Setting["sync_frequency"]) {
  return nextRun(frequency);
}
