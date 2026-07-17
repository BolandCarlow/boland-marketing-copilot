import { LeadsWorkspace } from "./leads-workspace";
import "./leads-hub.css";
import { demoWorkspaceData } from "@/lib/leads/demo-data";
import type { Lead, LeadOption, LeadStatus, LeadWorkspaceData } from "@/lib/leads/types";
import { createClient } from "@/lib/supabase/server";

const validStatuses: LeadStatus[] = ["New", "Contacted", "Appointment Booked", "Follow-up", "Closed", "Duplicate"];
const relationName = (value: unknown) => { const item = Array.isArray(value) ? value[0] : value; return item && typeof item === "object" && "name" in item ? String(item.name) : null; };
const relationSlug = (value: unknown) => { const item = Array.isArray(value) ? value[0] : value; return item && typeof item === "object" && "slug" in item ? String(item.slug) : null; };
const relationProvider = (value: unknown) => { const item = Array.isArray(value) ? value[0] : value; return item && typeof item === "object" && "provider" in item ? String(item.provider) : null; };

function asLead(row: Record<string, unknown>): Lead {
  const status = validStatuses.includes(row.status as LeadStatus) ? row.status as LeadStatus : "New";
  const notes = Array.isArray(row.lead_notes) ? row.lead_notes.map((note) => ({ id: String((note as Record<string, unknown>).id), body: String((note as Record<string, unknown>).body), createdAt: String((note as Record<string, unknown>).created_at), authorName: null })) : [];
  const salesperson = Array.isArray(row.salespeople) ? row.salespeople[0] : row.salespeople;
  return { id: String(row.id), occurredAt: String(row.occurred_at), source: relationName(row.lead_sources) ?? relationName(row.marketing_sources) ?? "Manual entry", sourceSlug: relationSlug(row.lead_sources) ?? relationProvider(row.marketing_sources) ?? "manual-entry", customerName: String(row.customer_name), email: row.customer_email ? String(row.customer_email) : row.email ? String(row.email) : null, phone: row.customer_phone ? String(row.customer_phone) : row.phone ? String(row.phone) : null, brand: relationName(row.brands), model: relationName(row.vehicle_models), registrationOrStockNumber: row.registration_or_stock_number ? String(row.registration_or_stock_number) : null, county: row.county ? String(row.county) : null, campaign: row.campaign_name ? String(row.campaign_name) : null, salesperson: relationName(salesperson) ?? (typeof row.salesperson === "string" ? row.salesperson : null), salespersonId: salesperson && typeof salesperson === "object" && "id" in salesperson ? String(salesperson.id) : null, status, notes, isDuplicate: Boolean(row.is_duplicate), isDemo: Boolean(row.is_demo) };
}

export default async function LeadsPage() {
  const supabase = await createClient();
  const [leadResult, sourceResult, salespeopleResult, brandResult, modelResult, spendResult] = await Promise.all([
    supabase.from("leads").select("id,occurred_at,customer_name,email,phone,salesperson,customer_email,customer_phone,registration_or_stock_number,county,campaign_name,status,is_duplicate,is_demo,lead_sources(name,slug),marketing_sources(name,provider),brands(name),vehicle_models(name),salespeople!leads_assigned_salesperson_id_fkey(id,name),lead_notes(id,body,created_at)").order("occurred_at", { ascending: false }).limit(500),
    supabase.from("lead_sources").select("id,name").eq("is_active", true).order("name"),
    supabase.from("salespeople").select("id,name").eq("is_active", true).order("name"),
    supabase.from("brands").select("id,name").order("name"),
    supabase.from("vehicle_models").select("id,name").order("name"),
    supabase.from("marketing_spend").select("amount,spend_date").gte("spend_date", new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10))
  ]);
  if (leadResult.error || sourceResult.error || salespeopleResult.error || brandResult.error || modelResult.error) return <LeadsWorkspace initialData={demoWorkspaceData} loadError />;
  const option = (rows: { id: string; name: string }[] | null): LeadOption[] => (rows ?? []).map((row) => ({ id: row.id, name: row.name }));
  const data: LeadWorkspaceData = { leads: (leadResult.data ?? []).map((row) => asLead(row as Record<string, unknown>)), sources: option(sourceResult.data), salespeople: option(salespeopleResult.data), brands: option(brandResult.data), models: option(modelResult.data), usingDemoData: false };
  const periodLeads = data.leads.filter((lead) => new Date(lead.occurredAt).getTime() >= Date.now() - 30 * 86_400_000).length;
  const spend = (spendResult.data ?? []).reduce((total, row) => total + Number(row.amount), 0);
  return <LeadsWorkspace initialData={data} costPerLead={spendResult.error || !spend || !periodLeads ? null : spend / periodLeads} />;
}
