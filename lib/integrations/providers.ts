import type { IntegrationDefinition } from "./types";

export const integrations: IntegrationDefinition[] = [
  {
    id: "google-analytics",
    name: "Google Analytics 4",
    description: "Bring website traffic, conversions and engagement into one view.",
    metrics: ["Users", "Sessions", "Conversions", "Engagement rate"],
    setupPath: "/api/integrations/google-analytics",
    environment: ["Google OAuth client ID", "Google OAuth client secret", "GA4 property ID"]
  },
  {
    id: "google-ads",
    name: "Google Ads",
    description: "Track campaign spend, clicks, leads and return on ad spend.",
    metrics: ["Spend", "Clicks", "Leads", "ROAS"],
    setupPath: "/api/integrations/google-ads",
    environment: ["GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "Developer token"]
  },
  {
    id: "meta-ads",
    name: "Meta Ads",
    description: "Monitor paid social performance across Facebook and Instagram.",
    metrics: ["Spend", "Impressions", "Leads", "Cost per lead"],
    setupPath: "/api/integrations/meta-ads",
    environment: ["META_APP_ID", "META_APP_SECRET", "Ad account ID"]
  }
];
