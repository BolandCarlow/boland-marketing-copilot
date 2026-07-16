import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeRecords, type AdMetric, type LeadRecord, type NormalizedRecord, type WebsiteMetric } from "./normalizers";
import type { ProviderId } from "./providers";

type SyncJob = {
  id: string;
  provider: ProviderId;
  payload: { records?: unknown[] };
};

function slug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function sourceId(provider: ProviderId) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("marketing_sources").select("id").eq("provider", provider).single();
  if (error || !data) throw new Error(`Marketing source is not seeded for ${provider}.`);
  return data.id as string;
}

async function brandId(brand?: string) {
  if (!brand) return null;
  const admin = createAdminClient();
  const bySlug = await admin.from("brands").select("id").eq("slug", slug(brand)).maybeSingle();
  if (bySlug.error) throw bySlug.error;
  if (bySlug.data) return bySlug.data.id as string;
  const byName = await admin.from("brands").select("id").ilike("name", brand).maybeSingle();
  if (byName.error) throw byName.error;
  return (byName.data?.id as string | undefined) ?? null;
}

async function vehicleModelId(vehicle: string | undefined, resolvedBrandId: string | null) {
  if (!vehicle || !resolvedBrandId) return null;
  const admin = createAdminClient();
  const bySlug = await admin.from("vehicle_models").select("id").eq("brand_id", resolvedBrandId).eq("slug", slug(vehicle)).maybeSingle();
  if (bySlug.error) throw bySlug.error;
  if (bySlug.data) return bySlug.data.id as string;
  const byName = await admin.from("vehicle_models").select("id").eq("brand_id", resolvedBrandId).ilike("name", vehicle).maybeSingle();
  if (byName.error) throw byName.error;
  return (byName.data?.id as string | undefined) ?? null;
}

async function campaignId(resolvedSourceId: string, externalId?: string) {
  if (!externalId) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.from("campaigns").select("id").eq("source_id", resolvedSourceId).eq("external_id", externalId).maybeSingle();
  if (error) throw error;
  return (data?.id as string | undefined) ?? null;
}

async function persistWebsiteMetric(provider: ProviderId, record: WebsiteMetric) {
  const admin = createAdminClient();
  const resolvedSourceId = await sourceId(provider);
  const { error } = await admin.from("website_metrics").upsert({
    source_id: resolvedSourceId,
    metric_date: record.metricDate,
    traffic_source: record.trafficSource,
    landing_page: record.landingPage,
    sessions: record.sessions,
    users: record.users,
    page_views: record.pageViews,
    engaged_sessions: record.engagedSessions,
    conversions: record.conversions,
    engagement_rate: record.engagementRate,
    raw_payload: record.rawPayload,
    updated_at: new Date().toISOString()
  }, { onConflict: "source_id,metric_date,traffic_source,landing_page" });
  if (error) throw error;
  return record.metricDate;
}

async function persistAdMetric(provider: ProviderId, record: AdMetric) {
  const admin = createAdminClient();
  const resolvedSourceId = await sourceId(provider);
  const resolvedBrandId = await brandId(record.brand);
  let resolvedCampaignId = await campaignId(resolvedSourceId, record.externalCampaignId);

  if (!resolvedCampaignId && record.campaignName) {
    const { data, error } = await admin.from("campaigns").insert({
      source_id: resolvedSourceId,
      brand_id: resolvedBrandId,
      external_id: record.externalCampaignId,
      name: record.campaignName,
      channel: provider === "google-ads" ? "Paid search" : "Paid social",
      status: "active"
    }).select("id").single();
    if (error) throw error;
    resolvedCampaignId = data.id as string;
  }

  const shared = {
    source_id: resolvedSourceId,
    campaign_id: resolvedCampaignId,
    external_campaign_id: record.externalCampaignId,
    metric_date: record.metricDate,
    impressions: record.impressions,
    clicks: record.clicks,
    spend: record.spend,
    raw_payload: record.rawPayload,
    updated_at: new Date().toISOString()
  };

  const result = provider === "google-ads"
    ? await admin.from("google_ads_metrics").upsert({
        ...shared,
        conversions: record.conversions ?? 0,
        conversion_value: record.conversionValue ?? 0
      }, { onConflict: "source_id,external_campaign_id,metric_date" })
    : await admin.from("meta_ads_metrics").upsert({
        ...shared,
        reach: record.reach ?? 0,
        leads: record.leads ?? 0
      }, { onConflict: "source_id,external_campaign_id,metric_date" });
  if (result.error) throw result.error;

  const { error: spendError } = await admin.from("marketing_spend").upsert({
    source_id: resolvedSourceId,
    campaign_id: resolvedCampaignId,
    brand_id: resolvedBrandId,
    external_campaign_id: record.externalCampaignId,
    spend_date: record.metricDate,
    platform: provider === "google-ads" ? "Google Ads" : "Meta Ads",
    amount: record.spend,
    impressions: record.impressions,
    clicks: record.clicks,
    attributed_leads: provider === "google-ads" ? Math.round(record.conversions ?? 0) : Math.round(record.leads ?? 0),
    raw_payload: record.rawPayload,
    updated_at: new Date().toISOString()
  }, { onConflict: "source_id,external_campaign_id,spend_date" });
  if (spendError) throw spendError;
  return record.metricDate;
}

async function persistLead(provider: ProviderId, record: LeadRecord) {
  const admin = createAdminClient();
  const resolvedSourceId = await sourceId(provider);
  const resolvedBrandId = await brandId(record.brand);
  const resolvedVehicleId = await vehicleModelId(record.vehicle, resolvedBrandId);
  const resolvedCampaignId = await campaignId(resolvedSourceId, record.campaignExternalId);
  const { error } = await admin.from("leads").upsert({
    external_id: record.externalId,
    source_id: resolvedSourceId,
    brand_id: resolvedBrandId,
    vehicle_model_id: resolvedVehicleId,
    campaign_id: resolvedCampaignId,
    occurred_at: record.occurredAt,
    customer_name: record.customerName,
    email: record.email,
    phone: record.phone,
    salesperson: record.salesperson,
    status: record.status,
    notes: record.notes,
    raw_payload: record.rawPayload,
    updated_at: new Date().toISOString()
  }, { onConflict: "source_id,external_id" });
  if (error) throw error;
  return record.occurredAt.slice(0, 10);
}

async function persistRecord(provider: ProviderId, record: NormalizedRecord) {
  if (record.kind === "website-metric") return persistWebsiteMetric(provider, record);
  if (record.kind === "lead") return persistLead(provider, record);
  return persistAdMetric(provider, record);
}

export async function enqueueSyncJob(provider: ProviderId, records: unknown[]) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("marketing_sync_jobs").insert({
    provider,
    payload: { records }
  }).select("id,status,queued_at").single();
  if (error) throw error;
  return data;
}

async function processJob(job: SyncJob) {
  const admin = createAdminClient();
  try {
    const records = normalizeRecords(job.provider, job.payload.records ?? []);
    const affectedDates = new Set<string>();
    for (const record of records) affectedDates.add(await persistRecord(job.provider, record));
    for (const affectedDate of affectedDates) {
      const { error } = await admin.rpc("refresh_daily_kpi_summary", { target_date: affectedDate });
      if (error) throw error;
    }
    await admin.from("marketing_sync_jobs").update({
      status: "completed", completed_at: new Date().toISOString(), error_message: null
    }).eq("id", job.id);
    await admin.from("integration_settings").update({
      last_sync_at: new Date().toISOString(), last_sync_status: "success", last_error: null
    }).eq("provider", job.provider);
    return { id: job.id, status: "completed" as const, records: records.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await admin.from("marketing_sync_jobs").update({
      status: "failed", completed_at: new Date().toISOString(), error_message: message
    }).eq("id", job.id);
    await admin.from("integration_settings").update({
      last_sync_at: new Date().toISOString(), last_sync_status: "failed", last_error: message
    }).eq("provider", job.provider);
    return { id: job.id, status: "failed" as const, error: message };
  }
}

export async function processPendingSyncJobs(limit = 10) {
  const admin = createAdminClient();
  const safeLimit = Math.max(1, Math.min(limit, 50));
  const { data, error } = await admin.rpc("claim_marketing_sync_jobs", { batch_size: safeLimit });
  if (error) throw error;
  const results = [];
  for (const job of (data ?? []) as SyncJob[]) results.push(await processJob(job));
  return results;
}

