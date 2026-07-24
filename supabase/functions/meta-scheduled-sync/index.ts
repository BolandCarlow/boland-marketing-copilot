// @ts-nocheck -- Supabase Edge Functions are checked by the Deno runtime on deploy.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

Deno.serve(async (request) => {
  const secret = Deno.env.get("META_SCHEDULER_SECRET");
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "Unauthorized." }, 401);

  const url = Deno.env.get("SUPABASE_URL"); const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) return json({ error: "Supabase Edge Function credentials are unavailable." }, 500);
  const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });
  const { data: connections, error } = await supabase.from("meta_connections").select("id,user_id").eq("scheduled_sync_enabled", true);
  if (error) return json({ error: error.message }, 500);

  const scheduledAt = new Date().toISOString(); const snapshotDate = scheduledAt.slice(0, 10);
  for (const connection of connections ?? []) {
    await supabase.from("meta_connections").update({ last_scheduled_at: scheduledAt }).eq("id", connection.id);
    await supabase.from("meta_snapshots").upsert({
      connection_id: connection.id, user_id: connection.user_id, snapshot_date: snapshotDate, status: "pending",
      payload: { source: "meta-scheduled-sync", liveMetaApiCalls: false, message: "Awaiting approval to enable Meta token exchange and insights sync." }
    }, { onConflict: "connection_id,snapshot_date" });
  }
  return json({ processed: (connections ?? []).length, liveMetaApiCalls: false });
});
