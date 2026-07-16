import { NextResponse } from "next/server";
import { integrations } from "@/lib/integrations/providers";
import type { IntegrationProvider } from "@/lib/integrations/types";

export async function GET(_: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const integration = integrations.find((item) => item.id === provider as IntegrationProvider);
  if (!integration) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  return NextResponse.json({ status: "configuration_required", provider: integration });
}
