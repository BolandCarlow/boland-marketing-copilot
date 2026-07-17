import type { LeadStatus, NormalizedLeadInput } from "./types";

export type ImportProvider = "email" | "csv" | "website-webhook" | "future-api";
export type ImportResult = { accepted: NormalizedLeadInput[]; rejected: { row: number; reason: string }[] };

export interface LeadImportAdapter<T> {
  provider: ImportProvider;
  normalize(input: T): ImportResult;
}

export const leadSources = ["Website", "Carzone", "DoneDeal", "CarsIreland", "Meta Lead Ads", "Google Ads", "Phone", "WhatsApp", "Walk-in", "Other", "Unattributed"] as const;

const sourceAliases: Record<string, typeof leadSources[number]> = {
  website: "Website", carzone: "Carzone", donedeal: "DoneDeal", carsireland: "CarsIreland",
  meta: "Meta Lead Ads", metaleadads: "Meta Lead Ads", facebook: "Meta Lead Ads", google: "Google Ads", googleads: "Google Ads",
  phone: "Phone", whatsapp: "WhatsApp", walkin: "Walk-in", other: "Other", unattributed: "Unattributed"
};

const statusAliases: Record<string, LeadStatus> = {
  new: "New", contacted: "Contacted", appointment: "Appointment Booked", "appointment booked": "Appointment Booked",
  "follow-up": "Follow-up", followup: "Follow-up", closed: "Closed", duplicate: "Duplicate"
};

function value(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) { const found = row[key]; if (typeof found === "string" && found.trim()) return found.trim(); }
  return undefined;
}

export function normalizePhone(input?: string) {
  if (!input) return undefined;
  const compact = input.replace(/[^\d+]/g, "");
  const digits = compact.replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.startsWith("353")) return `+${digits}`;
  if (digits.startsWith("0")) return `+353${digits.slice(1)}`;
  return compact.startsWith("+") ? `+${digits}` : digits;
}

export function normalizeDate(input?: string) {
  if (!input) return new Date().toISOString();
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function normaliseSource(input?: string) {
  const key = input?.toLowerCase().replace(/[^a-z]/g, "");
  return key ? sourceAliases[key] ?? "Unattributed" : "Unattributed";
}

export function normalizeRecord(row: Record<string, unknown>, fallbackSource: string, rowNumber = 1): ImportResult {
  const customerName = value(row, "customerName", "customer_name", "name", "full_name");
  if (!customerName) return { accepted: [], rejected: [{ row: rowNumber, reason: "Customer name is required." }] };
  const occurredAt = normalizeDate(value(row, "occurredAt", "occurred_at", "date", "date_time_received", "created_at"));
  if (!occurredAt) return { accepted: [], rejected: [{ row: rowNumber, reason: "Date/time received is not valid." }] };
  const rawStatus = value(row, "status", "lead_status")?.toLowerCase();
  return {
    accepted: [{
      externalId: value(row, "externalId", "external_id", "id"),
      occurredAt,
      source: normaliseSource(value(row, "source", "lead_source") ?? fallbackSource),
      customerName,
      email: value(row, "email", "customer_email"), phone: normalizePhone(value(row, "phone", "telephone", "customer_phone")),
      brand: value(row, "brand"), vehicleModel: value(row, "vehicleModel", "vehicle_model", "model"),
      registrationOrStockNumber: value(row, "registration", "stock_number", "registration_or_stock_number", "registrationOrStockNumber"),
      county: value(row, "county", "location"), campaign: value(row, "campaign", "campaign_name"),
      salesperson: value(row, "salesperson", "assigned_salesperson"), status: rawStatus ? statusAliases[rawStatus] : "New",
      notes: value(row, "notes", "message", "enquiry"), rawPayload: row
    }], rejected: []
  };
}

export const csvLeadAdapter: LeadImportAdapter<Record<string, unknown>[]> = {
  provider: "csv",
  normalize(rows) { return rows.reduce<ImportResult>((result, row, index) => { const next = normalizeRecord(row, "Unattributed", index + 2); result.accepted.push(...next.accepted); result.rejected.push(...next.rejected); return result; }, { accepted: [], rejected: [] }); }
};

export const websiteWebhookAdapter: LeadImportAdapter<Record<string, unknown>> = {
  provider: "website-webhook", normalize: (payload) => normalizeRecord(payload, "Website")
};

export const emailLeadAdapter: LeadImportAdapter<{ subject?: string; receivedAt?: string; fields: Record<string, unknown> }> = {
  provider: "email",
  normalize(message) { return normalizeRecord({ ...message.fields, occurredAt: message.receivedAt, source: "Gmail Lead Inbox", campaign: message.subject }, "Gmail Lead Inbox"); }
};

export const futureApiAdapter: LeadImportAdapter<Record<string, unknown>[]> = {
  provider: "future-api",
  normalize(rows) { return rows.reduce<ImportResult>((result, row, index) => { const next = normalizeRecord(row, String(row.source ?? "Unattributed"), index + 1); result.accepted.push(...next.accepted); result.rejected.push(...next.rejected); return result; }, { accepted: [], rejected: [] }); }
};
