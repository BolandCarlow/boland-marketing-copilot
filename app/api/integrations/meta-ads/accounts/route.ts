import { NextResponse } from "next/server";
import { decryptMetaCredential } from "@/lib/meta/crypto";
import { discoverMetaBusinesses } from "@/lib/meta/graph";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { data: connection, error } = await supabase.from("meta_connections").select("encrypted_access_token,connection_status").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Meta connection could not be read." }, { status: 500 });
  if (connection?.connection_status !== "connected" || !connection.encrypted_access_token) return NextResponse.json({ error: "Connect Meta before loading Business Managers and ad accounts." }, { status: 400 });
  try { return NextResponse.json({ businesses: await discoverMetaBusinesses(decryptMetaCredential(connection.encrypted_access_token)) }); }
  catch (exception) { return NextResponse.json({ error: exception instanceof Error ? exception.message : "Meta Business Managers could not be loaded." }, { status: 400 }); }
}
