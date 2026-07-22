"use server";

import { revalidatePath } from "next/cache";
import { disconnectGa4, testGa4Connection, triggerGa4Sync } from "@/lib/integrations/google-analytics";
import { createClient } from "@/lib/supabase/server";

export type Ga4ActionState = { status: "idle" | "success" | "error"; message: string };

export async function performGa4Action(_state: Ga4ActionState, formData: FormData): Promise<Ga4ActionState> {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Your session has expired. Please sign in again." };
  try {
    const operation = String(formData.get("operation") ?? "");
    const message = operation === "test" ? await testGa4Connection(user.id)
      : operation === "sync" ? await triggerGa4Sync(user.id)
      : operation === "disconnect" ? (await disconnectGa4(user.id), "Google Analytics has been disconnected.")
      : null;
    if (!message) return { status: "error", message: "Unknown Google Analytics action." };
    revalidatePath("/dashboard/settings/integrations");
    return { status: "success", message };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Google Analytics action failed." };
  }
}
