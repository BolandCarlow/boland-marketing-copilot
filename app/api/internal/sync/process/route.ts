import { NextResponse } from "next/server";
import { hasValidSyncSecret } from "@/lib/data-platform/security";
import { processPendingSyncJobs } from "@/lib/data-platform/sync-service";

export async function POST(request: Request) {
  if (!hasValidSyncSecret(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({})) as { limit?: number };
    const results = await processPendingSyncJobs(body.limit ?? 10);
    return NextResponse.json({ processed: results.length, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process sync jobs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
