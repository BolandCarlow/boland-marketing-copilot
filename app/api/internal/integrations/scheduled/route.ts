import { NextResponse } from "next/server";
import { hasValidScheduledSyncSecret } from "@/lib/data-platform/security";
import { runDueScheduledIntegrations } from "@/lib/integrations/orchestrator";

async function runScheduledIntegrations(request: Request) {
  if (!hasValidScheduledSyncSecret(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({})) as { limit?: number };
    const results = await runDueScheduledIntegrations(body.limit ?? 25);
    return NextResponse.json({ processed: results.length, results });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scheduled integration run failed." }, { status: 500 });
  }
}

export async function GET(request: Request) { return runScheduledIntegrations(request); }
export async function POST(request: Request) { return runScheduledIntegrations(request); }
