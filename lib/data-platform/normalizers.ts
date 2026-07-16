import type { ProviderId } from "./providers";

type InputRecord = Record<string, unknown>;

export type WebsiteMetric = {
  kind: "website-metric";
  metricDate: string;
  trafficSource: string;
  landingPage: string;
  sessions: number;
  users: number;
  pageViews: number;
  engagedSessions: number;
  conversions: number;
  engagementRate: number;
  rawPayload: InputRecord;
};

export type AdMetric = {
  kind: "google-ads-metric" | "meta-ads-metric";
  metricDate: string;
  externalCampaignId: string;
  campaignName?: string;
  brand?: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions?: number;
  conversionValue?: number;
  reach?: number;
  leads?: number;
  rawPayload: InputRecord;
};

export type LeadRecord = {
  kind: "lead";
  externalId: string;
  occurredAt: string;
  brand?: string;
  vehicle?: string;
  campaignExternalId?: string;
  customerName: string;
  email?: string;
  phone?: string;
  salesperson?: string;
  status: "new" | "contacted" | "qualified" | "appointment" | "won" | "lost";
  notes?: string;
  rawPayload: InputRecord;
};

export type NormalizedRecord = WebsiteMetric | AdMetric | LeadRecord;

function text(record: InputRecord, key: string, required = false) {
  const value = record[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (required) throw new Error(`Missing required field: ${key}`);
  return undefined;
}

function number(record: InputRecord, key: string) {
  const value = Number(record[key] ?? 0);
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid non-negative number: ${key}`);
  return value;
}

function date(record: InputRecord, key: string) {
  const value = text(record, key, true)!;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`Invalid date field: ${key}`);
  }
  return value;
}

function timestamp(record: InputRecord, key: string) {
  const value = text(record, key, true)!;
  if (Number.isNaN(Date.parse(value))) throw new Error(`Invalid timestamp field: ${key}`);
  return new Date(value).toISOString();
}

function normalizeWebsiteMetric(record: InputRecord): WebsiteMetric {
  return {
    kind: "website-metric",
    metricDate: date(record, "date"),
    trafficSource: text(record, "trafficSource") ?? "all",
    landingPage: text(record, "landingPage") ?? "/",
    sessions: number(record, "sessions"),
    users: number(record, "users"),
    pageViews: number(record, "pageViews"),
    engagedSessions: number(record, "engagedSessions"),
    conversions: number(record, "conversions"),
    engagementRate: number(record, "engagementRate"),
    rawPayload: record
  };
}

function normalizeAdMetric(record: InputRecord, kind: AdMetric["kind"]): AdMetric {
  return {
    kind,
    metricDate: date(record, "date"),
    externalCampaignId: text(record, "campaignId", true)!,
    campaignName: text(record, "campaignName"),
    brand: text(record, "brand"),
    impressions: number(record, "impressions"),
    clicks: number(record, "clicks"),
    spend: number(record, "spend"),
    conversions: number(record, "conversions"),
    conversionValue: number(record, "conversionValue"),
    reach: number(record, "reach"),
    leads: number(record, "leads"),
    rawPayload: record
  };
}

function normalizeLead(record: InputRecord): LeadRecord {
  const status = text(record, "status") ?? "new";
  const allowed = ["new", "contacted", "qualified", "appointment", "won", "lost"] as const;
  if (!allowed.includes(status as (typeof allowed)[number])) throw new Error("Invalid lead status.");
  return {
    kind: "lead",
    externalId: text(record, "externalId", true)!,
    occurredAt: timestamp(record, "occurredAt"),
    brand: text(record, "brand"),
    vehicle: text(record, "vehicle"),
    campaignExternalId: text(record, "campaignId"),
    customerName: text(record, "customerName", true)!,
    email: text(record, "email"),
    phone: text(record, "phone"),
    salesperson: text(record, "salesperson"),
    status: status as LeadRecord["status"],
    notes: text(record, "notes"),
    rawPayload: record
  };
}

export function normalizeRecords(provider: ProviderId, records: unknown[]): NormalizedRecord[] {
  return records.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`Record ${index + 1} must be a JSON object.`);
    }
    const record = value as InputRecord;
    if (provider === "ga4") return normalizeWebsiteMetric(record);
    if (provider === "google-ads") return normalizeAdMetric(record, "google-ads-metric");
    if (provider === "meta-ads") return normalizeAdMetric(record, "meta-ads-metric");
    return normalizeLead(record);
  });
}
