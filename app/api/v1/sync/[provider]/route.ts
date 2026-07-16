import { NextResponse } from "next/server";
import { enqueueSyncJob } from "@/lib/data-platform/sync-service";
import { getProvider, isProviderId } from "@/lib/data-platform/providers";
import { hasValidSyncSecret } from "@/lib/data-platform/security";

type Context = { params: Promise<{ provider: string }> };

export async function GET(_request: Request, context: Context) {
  const { provider } = await context.params;
  const definition = getProvider(provider);
  if (!definition) return NextResponse.json({ error: "Unknown provider." }, { status: 404 });
  return NextResponse.json({
    provider: definition.id,
    name: definition.name,
    accepts: definition.acceptedRecord,
    mode: "queue-only",
    liveApiConnected: false
  });
}

export async function POST(request: Request, context: Context) {
  if (!hasValidSyncSecret(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { provider } = await context.params;
  if (!isProviderId(provider)) return NextResponse.json({ error: "Unknown provider." }, { status: 404 });

  try {
    const body = await request.json() as { records?: unknown[] };
    if (!Array.isArray(body.records) || body.records.length === 0) {
      return NextResponse.json({ error: "Provide a non-empty records array." }, { status: 400 });
    }
    if (body.records.length > 500) {
      return NextResponse.json({ error: "A batch can contain at most 500 records." }, { status: 413 });
    }
    const job = await enqueueSyncJob(provider, body.records);
    return NextResponse.json({ job, message: "Batch queued for normalization." }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to queue batch.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
