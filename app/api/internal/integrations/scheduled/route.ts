import { NextResponse } from "next/server";
import { hasValidSyncSecret } from "@/lib/data-platform/security";
import { runDueScheduledIntegrations } from "@/lib/integrations/orchestrator";

export async function POST(request: Request) {
  if (!hasValidSyncSecret(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({})) as { limit?: number };
    const results = await runDueScheduledIntegrations(body.limit ?? 25);
    return NextResponse.json({ processed: results.length, results, liveApiConnected: false });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scheduled integration run failed." }, { status: 500 });
  }
}

