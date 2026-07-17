export const leadStatuses = [
  "New",
  "Contacted",
  "Appointment Booked",
  "Follow-up",
  "Closed",
  "Duplicate"
] as const;

export type LeadStatus = (typeof leadStatuses)[number];

export type LeadNote = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string | null;
};

export type Lead = {
  id: string;
  occurredAt: string;
  source: string;
  sourceSlug: string;
  customerName: string;
  email: string | null;
  phone: string | null;
  brand: string | null;
  model: string | null;
  registrationOrStockNumber: string | null;
  county: string | null;
  campaign: string | null;
  salesperson: string | null;
  salespersonId: string | null;
  status: LeadStatus;
  notes: LeadNote[];
  isDuplicate: boolean;
  isDemo: boolean;
};

export type LeadOption = { id: string; name: string };

export type LeadWorkspaceData = {
  leads: Lead[];
  sources: LeadOption[];
  salespeople: LeadOption[];
  brands: LeadOption[];
  models: LeadOption[];
  usingDemoData: boolean;
};

export type NormalizedLeadInput = {
  externalId?: string;
  occurredAt: string;
  source: string;
  customerName: string;
  email?: string;
  phone?: string;
  brand?: string;
  vehicleModel?: string;
  registrationOrStockNumber?: string;
  county?: string;
  campaign?: string;
  salesperson?: string;
  status?: LeadStatus;
  notes?: string;
  rawPayload?: Record<string, unknown>;
};
