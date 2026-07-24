import "server-only";
import type { ConnectionTestResult, IntegrationAdapter, IntegrationConfiguration, SyncResult } from "./adapter-registry";

// This adapter intentionally makes no Meta Graph API calls. OAuth token exchange,
// refresh and insights sync are enabled only after their live API review is approved.
class MetaAdsAdapter implements IntegrationAdapter {
  readonly provider = "meta-ads" as const;
  readonly live = false;

  async testConnection(configuration: IntegrationConfiguration): Promise<ConnectionTestResult> {
    const configurationValid = Boolean(configuration.accountIdentifier || configuration.hasCredentials);
    return {
      ok: false,
      configurationValid,
      liveConnectionAttempted: false,
      message: "Meta connection testing is scaffolded but disabled until live Meta API calls are authorised."
    };
  }

  async sync(): Promise<SyncResult> {
    return {
      status: "skipped",
      recordsReceived: 0,
      recordsProcessed: 0,
      liveConnectionAttempted: false,
      message: "Meta Ads sync is scaffolded but disabled until live Meta API calls are authorised."
    };
  }
}

export const metaAdsAdapter = new MetaAdsAdapter();
