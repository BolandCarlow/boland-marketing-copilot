import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Meta ad-account discovery is disabled until live Meta API calls are authorised." }, { status: 501 });
}
