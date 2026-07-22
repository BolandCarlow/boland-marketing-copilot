export const providerIds = [
  "ga4",
  "google-ads",
  "meta-ads",
  "carzone",
  "donedeal",
  "carsireland",
  "website-enquiries",
  "gmail-lead-inbox"
] as const;

export type ProviderId = (typeof providerIds)[number];
export type AuthenticationType = "oauth" | "api_key" | "service_account" | "webhook";

export type ProviderDefinition = {
  id: ProviderId;
  name: string;
  category: string;
  description: string;
  accountLabel: string;
  accountPlaceholder: string;
  credentialLabel: string;
  credentialPlaceholder: string;
  acceptedRecord: string;
  authenticationTypes: AuthenticationType[];
  defaultAuthenticationType: AuthenticationType;
  capabilities: string[];
};

export const providers: ProviderDefinition[] = [
  {
    id: "ga4",
    name: "Google Analytics 4",
    category: "Website analytics",
    description: "Website sessions, users, engagement and conversions.",
    accountLabel: "GA4 property ID",
    accountPlaceholder: "123456789",
    credentialLabel: "Google OAuth connection",
    credentialPlaceholder: "Connect Google Analytics from the integrations page.",
    acceptedRecord: "Daily website metrics grouped by source and landing page",
    authenticationTypes: ["oauth"],
    defaultAuthenticationType: "oauth",
    capabilities: ["Analytics", "Conversions"]
  },
  {
    id: "google-ads",
    name: "Google Ads",
    category: "Paid search",
    description: "Campaign spend, clicks, impressions and conversion value.",
    accountLabel: "Customer ID",
    accountPlaceholder: "123-456-7890",
    credentialLabel: "OAuth or API credentials",
    credentialPlaceholder: "Reserved for OAuth refresh credentials and developer token.",
    acceptedRecord: "Daily campaign performance",
    authenticationTypes: ["oauth", "api_key"],
    defaultAuthenticationType: "oauth",
    capabilities: ["Campaigns", "Spend", "Conversions"]
  },
  {
    id: "meta-ads",
    name: "Meta Ads",
    category: "Paid social",
    description: "Facebook and Instagram campaign delivery and leads.",
    accountLabel: "Ad account ID",
    accountPlaceholder: "act_123456789",
    credentialLabel: "OAuth or access-token configuration",
    credentialPlaceholder: "Reserved for a long-lived access token.",
    acceptedRecord: "Daily campaign performance",
    authenticationTypes: ["oauth", "api_key"],
    defaultAuthenticationType: "oauth",
    capabilities: ["Campaigns", "Spend", "Leads"]
  },
  {
    id: "carzone",
    name: "Carzone",
    category: "Marketplace",
    description: "Vehicle enquiries received from Carzone.",
    accountLabel: "Dealer ID",
    accountPlaceholder: "Boland dealer identifier",
    credentialLabel: "Feed or API credentials",
    credentialPlaceholder: "Reserved for future feed or API credentials.",
    acceptedRecord: "Lead enquiries",
    authenticationTypes: ["api_key"],
    defaultAuthenticationType: "api_key",
    capabilities: ["Leads", "Vehicle attribution"]
  },
  {
    id: "donedeal",
    name: "DoneDeal",
    category: "Marketplace",
    description: "Vehicle enquiries received from DoneDeal.",
    accountLabel: "Dealer ID",
    accountPlaceholder: "Boland dealer identifier",
    credentialLabel: "Feed or API credentials",
    credentialPlaceholder: "Reserved for future feed or API credentials.",
    acceptedRecord: "Lead enquiries",
    authenticationTypes: ["api_key"],
    defaultAuthenticationType: "api_key",
    capabilities: ["Leads", "Vehicle attribution"]
  },
  {
    id: "carsireland",
    name: "CarsIreland",
    category: "Marketplace",
    description: "Vehicle enquiries received from CarsIreland.",
    accountLabel: "Dealer ID",
    accountPlaceholder: "Boland dealer identifier",
    credentialLabel: "Feed or API credentials",
    credentialPlaceholder: "Reserved for future feed or API credentials.",
    acceptedRecord: "Lead enquiries",
    authenticationTypes: ["api_key"],
    defaultAuthenticationType: "api_key",
    capabilities: ["Leads", "Vehicle attribution"]
  },
  {
    id: "website-enquiries",
    name: "Website Forms",
    category: "First-party leads",
    description: "Test-drive, finance and contact forms from Boland websites.",
    accountLabel: "Site or form ID",
    accountPlaceholder: "boland-carlow",
    credentialLabel: "Webhook signing secret",
    credentialPlaceholder: "Reserved for webhook signature verification.",
    acceptedRecord: "Lead enquiries",
    authenticationTypes: ["webhook", "api_key"],
    defaultAuthenticationType: "webhook",
    capabilities: ["Leads", "Form attribution"]
  },
  {
    id: "gmail-lead-inbox",
    name: "Gmail Lead Inbox",
    category: "Email leads",
    description: "Parse dealership enquiries delivered to a dedicated Gmail inbox.",
    accountLabel: "Inbox address",
    accountPlaceholder: "leads@boland.example",
    credentialLabel: "Google OAuth credentials",
    credentialPlaceholder: "Reserved for a delegated Gmail OAuth connection.",
    acceptedRecord: "Lead enquiries extracted from approved inbox messages",
    authenticationTypes: ["oauth"],
    defaultAuthenticationType: "oauth",
    capabilities: ["Leads", "Inbox parsing"]
  }
];

export function isProviderId(value: string): value is ProviderId {
  return providerIds.includes(value as ProviderId);
}

export function isAuthenticationType(value: string): value is AuthenticationType {
  return ["oauth", "api_key", "service_account", "webhook"].includes(value);
}

export function getProvider(value: string) {
  return providers.find((provider) => provider.id === value);
}

