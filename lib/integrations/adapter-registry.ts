import "server-only";
import type { ProviderId } from "@/lib/data-platform/providers";
import { metaAdsAdapter } from "./meta-ads";

export type IntegrationConfiguration = {
  accountIdentifier: string | null;
  hasCredentials: boolean;
  authenticationType: string;
  encryptedCredentials?: string | null;
};

export type ConnectionTestResult = {
  ok: boolean;
  configurationValid: boolean;
  liveConnectionAttempted: boolean;
  message: string;
};

export type SyncResult = {
  status: "success" | "failed" | "skipped";
  recordsReceived: number;
  recordsProcessed: number;
  liveConnectionAttempted: boolean;
  message: string;
  records?: unknown[];
};

export interface IntegrationAdapter {
  readonly provider: ProviderId;
  readonly live: boolean;
  testConnection(configuration: IntegrationConfiguration): Promise<ConnectionTestResult>;
  sync(configuration: IntegrationConfiguration): Promise<SyncResult>;
}

class PlaceholderAdapter implements IntegrationAdapter {
  readonly live = false;

  constructor(readonly provider: ProviderId) {}

  async testConnection(configuration: IntegrationConfiguration): Promise<ConnectionTestResult> {
    const configurationValid = Boolean(configuration.accountIdentifier && configuration.hasCredentials);
    return {
      ok: configurationValid,
      configurationValid,
      liveConnectionAttempted: false,
      message: configurationValid
        ? "Configuration is stored securely. The live connection test remains disabled in foundation mode."
        : "Add an account identifier and credentials before testing this integration."
    };
  }

  async sync(): Promise<SyncResult> {
    return {
      status: "skipped",
      recordsReceived: 0,
      recordsProcessed: 0,
      liveConnectionAttempted: false,
      message: "Sync framework is ready, but this provider adapter is not connected to a live API."
    };
  }
}

const adapters = new Map<ProviderId, IntegrationAdapter>([["meta-ads", metaAdsAdapter]]);

export function registerIntegrationAdapter(adapter: IntegrationAdapter) {
  adapters.set(adapter.provider, adapter);
}

export function getIntegrationAdapter(provider: ProviderId) {
  return adapters.get(provider) ?? new PlaceholderAdapter(provider);
}
