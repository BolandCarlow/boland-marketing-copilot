import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone, normalizeRecord } from "@/lib/leads/imports";

type Decision = "skip" | "merge" | "import";
type RequestRow = Record<string, unknown> & { __row?: number; __duplicateAction?: Decision; __duplicateOfId?: string };

const key = (value?: string | null) => value?.trim().toLowerCase() || "";

export async function POST(request: Request) {
  const body = await request.json() as { fileName?: string; rows?: RequestRow[] };
  if (!Array.isArray(body.rows) || !body.rows.length) return NextResponse.json({ error: "Choose a CSV with at least one data row." }, { status: 422 });
  if (body.rows.length > 2_000) return NextResponse.json({ error: "Imports are limited to 2,000 rows at a time." }, { status: 422 });

  const supabase = await createClient();
  const normalized = body.rows.map((row, index) => ({ row, result: normalizeRecord(row, "Unattributed", Number(row.__row) || index + 2) }));
  const rejected = normalized.flatMap(({ result }) => result.rejected);
  const accepted = normalized.flatMap(({ row, result }) => result.accepted.map((lead) => ({ row, lead })));
  const [sourcesResult, brandsResult, modelsResult, peopleResult, existingResult] = await Promise.all([
    supabase.from("lead_sources").select("id,name"), supabase.from("brands").select("id,name"),
    supabase.from("vehicle_models").select("id,name"), supabase.from("salespeople").select("id,name"),
    supabase.from("leads").select("id,customer_email,customer_phone").limit(2_000)
  ]);
  if (sourcesResult.error || brandsResult.error || modelsResult.error || peopleResult.error || existingResult.error) return NextResponse.json({ error: "Reference data could not be loaded." }, { status: 500 });
  const idByName = (items: { id: string; name: string }[] | null) => new Map((items ?? []).map((item) => [key(item.name), item.id]));
  const sourceIds = idByName(sourcesResult.data); const brandIds = idByName(brandsResult.data); const modelIds = idByName(modelsResult.data); const personIds = idByName(peopleResult.data);
  const duplicates = new Map<string, string>();
  for (const lead of existingResult.data ?? []) {
    if (lead.customer_email) duplicates.set(`email:${key(lead.customer_email)}`, lead.id);
    const phone = normalizePhone(lead.customer_phone ?? undefined); if (phone) duplicates.set(`phone:${phone}`, lead.id);
  }
  let imported = 0; let skipped = 0; let merged = 0;
  for (const { row, lead } of accepted) {
    const matchedId = row.__duplicateOfId || (lead.email ? duplicates.get(`email:${key(lead.email)}`) : undefined) || (lead.phone ? duplicates.get(`phone:${lead.phone}`) : undefined);
    const action: Decision = row.__duplicateAction ?? (matchedId ? "skip" : "import");
    if (matchedId && action === "skip") { skipped += 1; continue; }
    const values = {
      customer_name: lead.customerName, customer_email: lead.email || null, customer_phone: lead.phone || null,
      lead_source_id: sourceIds.get(key(lead.source)) ?? sourceIds.get("unattributed") ?? null,
      brand_id: lead.brand ? brandIds.get(key(lead.brand)) ?? null : null, vehicle_model_id: lead.vehicleModel ? modelIds.get(key(lead.vehicleModel)) ?? null : null,
      registration_or_stock_number: lead.registrationOrStockNumber || null, county: lead.county || null, campaign_name: lead.campaign || null,
      assigned_salesperson_id: lead.salesperson ? personIds.get(key(lead.salesperson)) ?? null : null, occurred_at: lead.occurredAt,
      status: lead.status ?? "New", is_duplicate: Boolean(matchedId && action === "import"), duplicate_of_lead_id: matchedId && action === "import" ? matchedId : null,
      import_provider: "csv", import_external_id: lead.externalId || null, raw_payload: lead.rawPayload ?? row
    };
    if (matchedId && action === "merge") {
      const { error } = await supabase.from("leads").update(values).eq("id", matchedId); if (error) rejected.push({ row: Number(row.__row) || 0, reason: error.message }); else merged += 1;
    } else {
      const { error } = await supabase.from("leads").insert(values); if (error) rejected.push({ row: Number(row.__row) || 0, reason: error.message }); else imported += 1;
    }
  }
  const history = { file_name: body.fileName?.slice(0, 255) || "lead-import.csv", total_rows: body.rows.length, imported_rows: imported, skipped_rows: skipped, merged_rows: merged, error_rows: rejected.length, errors: rejected };
  const historyResult = await supabase.from("lead_import_history").insert(history);
  if (historyResult.error) return NextResponse.json({ error: "Leads were processed but import history could not be saved." }, { status: 500 });
  return NextResponse.json({ imported, skipped, merged, errors: rejected });
}
