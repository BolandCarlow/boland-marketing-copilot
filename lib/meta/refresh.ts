import "server-only";

export type MetaRefreshResult = { status: "skipped"; message: string };

// Deliberately network-free until live Meta API access is authorised.
// The encrypted refresh-token and expiry fields are already present in meta_connections.
export async function refreshMetaAccessToken(): Promise<MetaRefreshResult> {
  return { status: "skipped", message: "Meta token refresh is scaffolded but disabled until live Meta API calls are authorised." };
}
