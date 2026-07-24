import "server-only";

import { decryptMetaCredential, encryptMetaCredential } from "./crypto";
import { refreshMetaLongLivedToken } from "./graph";
import { createAdminClient } from "@/lib/supabase/admin";

export async function refreshMetaAccessToken(connectionId: string, encryptedAccessToken: string) {
  const now = new Date().toISOString();
  try {
    const refreshed = await refreshMetaLongLivedToken(decryptMetaCredential(encryptedAccessToken));
    const { error } = await createAdminClient().from("meta_connections").update({
      encrypted_access_token: encryptMetaCredential(refreshed.accessToken), token_expires_at: refreshed.expiresAt,
      last_refresh_attempt_at: now, last_refresh_error: null
    }).eq("id", connectionId);
    if (error) throw error;
    return { status: "refreshed" as const, expiresAt: refreshed.expiresAt };
  } catch (exception) {
    const message = exception instanceof Error ? exception.message : "Meta access-token refresh failed.";
    await createAdminClient().from("meta_connections").update({ last_refresh_attempt_at: now, last_refresh_error: message.slice(0, 500) }).eq("id", connectionId);
    throw new Error(message);
  }
}
