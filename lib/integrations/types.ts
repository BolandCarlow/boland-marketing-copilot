export type IntegrationProvider = "google-analytics" | "google-ads" | "meta-ads";

export type IntegrationDefinition = {
  id: IntegrationProvider;
  name: string;
  description: string;
  metrics: string[];
  setupPath: string;
  environment: string[];
};
