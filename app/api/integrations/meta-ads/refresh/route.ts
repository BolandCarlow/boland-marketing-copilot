import { NextResponse } from "next/server";
import { refreshMetaAccessToken } from "@/lib/meta/refresh";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { data: connection, error } = await supabase.from("meta_connections").select("id,encrypted_access_token").eq("user_id", user.id).maybeSingle();
  if (error || !connection?.encrypted_access_token) return NextResponse.json({ error: "Connect Meta before refreshing its token." }, { status: 400 });
  try { return NextResponse.json(await refreshMetaAccessToken(connection.id, connection.encrypted_access_token)); }
  catch (exception) { return NextResponse.json({ error: exception instanceof Error ? exception.message : "Meta token refresh failed." }, { status: 400 }); }
}
