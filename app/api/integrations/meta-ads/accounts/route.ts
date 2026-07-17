import { NextResponse } from "next/server";
import { listMetaAdAccounts } from "@/lib/integrations/meta-ads";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { data, error } = await supabase.from("integration_settings").select("encrypted_credentials").eq("user_id", user.id).eq("provider", "meta-ads").maybeSingle();
  if (error) return NextResponse.json({ error: "Meta Ads settings could not be read." }, { status: 500 });
  if (!data?.encrypted_credentials) return NextResponse.json({ error: "Connect Meta Ads before loading ad accounts." }, { status: 400 });
  try { return NextResponse.json({ accounts: await listMetaAdAccounts(data.encrypted_credentials) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Meta ad accounts could not be loaded." }, { status: 400 }); }
}
