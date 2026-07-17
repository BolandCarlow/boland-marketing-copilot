import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeDate, normalizePhone, normaliseSource } from "@/lib/leads/imports";
import { leadStatuses } from "@/lib/leads/types";

export async function POST(request: Request) {
  const body = await request.json() as Record<string, string>;
  if (!body.customerName?.trim()) return NextResponse.json({ error: "Customer name is required." }, { status: 422 });
  const occurredAt = normalizeDate(body.occurredAt);
  if (!occurredAt) return NextResponse.json({ error: "Date/time received is not valid." }, { status: 422 });
  const supabase = await createClient();
  const [sourceResult, brandResult, modelResult, salespersonResult] = await Promise.all([
    supabase.from("lead_sources").select("id").eq("name", normaliseSource(body.source)).maybeSingle(),
    body.brand ? supabase.from("brands").select("id").eq("name", body.brand).maybeSingle() : Promise.resolve({ data: null, error: null }),
    body.model ? supabase.from("vehicle_models").select("id").eq("name", body.model).maybeSingle() : Promise.resolve({ data: null, error: null }),
    body.salesperson ? supabase.from("salespeople").select("id").eq("name", body.salesperson).maybeSingle() : Promise.resolve({ data: null, error: null })
  ]);
  if (sourceResult.error || brandResult.error || modelResult.error || salespersonResult.error) return NextResponse.json({ error: "Reference data could not be loaded." }, { status: 500 });
  const { data, error } = await supabase.from("leads").insert({
    customer_name: body.customerName.trim(), customer_email: body.email?.trim() || null, customer_phone: normalizePhone(body.phone) || null,
    lead_source_id: sourceResult.data?.id ?? null, brand_id: brandResult.data?.id ?? null, vehicle_model_id: modelResult.data?.id ?? null,
    registration_or_stock_number: body.stock?.trim() || null, county: body.county?.trim() || null, campaign_name: body.campaign?.trim() || null,
    assigned_salesperson_id: salespersonResult.data?.id ?? null, occurred_at: occurredAt,
    status: leadStatuses.includes(body.status as typeof leadStatuses[number]) ? body.status : "New", import_provider: "manual"
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (body.notes?.trim()) { const noteResult = await supabase.from("lead_notes").insert({ lead_id: data.id, body: body.notes.trim() }); if (noteResult.error) return NextResponse.json({ error: noteResult.error.message }, { status: 500 }); }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
