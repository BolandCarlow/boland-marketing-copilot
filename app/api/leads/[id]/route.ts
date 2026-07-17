import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { leadStatuses } from "@/lib/leads/types";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const body = await request.json() as Record<string, unknown>; const supabase = await createClient();
  const updates: Record<string, unknown> = {};
  if (typeof body.status === "string" && leadStatuses.includes(body.status as typeof leadStatuses[number])) updates.status = body.status;
  if (body.salespersonId === null || typeof body.salespersonId === "string") updates.assigned_salesperson_id = body.salespersonId;
  if (typeof body.isDuplicate === "boolean") updates.is_duplicate = body.isDuplicate;
  const { error } = Object.keys(updates).length ? await supabase.from("leads").update(updates).eq("id", id) : { error: null };
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (Array.isArray(body.notes) && body.notes.length) { const last = body.notes.at(-1) as { body?: string } | undefined; if (last?.body) { const noteResult = await supabase.from("lead_notes").insert({ lead_id: id, body: last.body }); if (noteResult.error) return NextResponse.json({ error: noteResult.error.message }, { status: 500 }); } }
  return NextResponse.json({ ok: true });
}
