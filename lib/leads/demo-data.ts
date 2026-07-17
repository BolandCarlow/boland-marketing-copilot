import type { Lead, LeadWorkspaceData } from "./types";

const note = (body: string) => [{ id: crypto.randomUUID(), body, createdAt: new Date().toISOString(), authorName: "Boland Demo" }];
const today = new Date();
const at = (hoursAgo: number) => new Date(today.getTime() - hoursAgo * 3_600_000).toISOString();

export const demoLeads: Lead[] = [
  { id: "demo-1", occurredAt: at(1), source: "Website", sourceSlug: "website", customerName: "Aisling Murphy", email: "aisling.murphy@example.invalid", phone: "+353 85 123 4567", brand: "Škoda", model: "Kodiaq", registrationOrStockNumber: "261-CW-2481", county: "Carlow", campaign: "Škoda SUV Event", salesperson: "Niamh Doyle", salespersonId: "demo-sp-1", status: "New", notes: note("Asked for a Kodiaq Sportline test drive this weekend."), isDuplicate: false, isDemo: true },
  { id: "demo-2", occurredAt: at(2), source: "Meta Lead Ads", sourceSlug: "meta-lead-ads", customerName: "Conor Byrne", email: "conor.byrne@example.invalid", phone: "+353 86 987 6512", brand: "Volvo", model: "EX30", registrationOrStockNumber: null, county: "Kilkenny", campaign: "Volvo Electric Range", salesperson: "Eoin Walsh", salespersonId: "demo-sp-2", status: "Contacted", notes: note("Requested a finance illustration; follow-up scheduled for 16:00."), isDuplicate: false, isDemo: true },
  { id: "demo-3", occurredAt: at(4), source: "DoneDeal", sourceSlug: "donedeal", customerName: "Sarah Keane", email: "sarah.keane@example.invalid", phone: "+353 87 440 1298", brand: "Used Cars", model: "Toyota RAV4", registrationOrStockNumber: "201-WW-8104", county: "Wexford", campaign: null, salesperson: "Grace Nolan", salespersonId: "demo-sp-3", status: "Appointment Booked", notes: note("Viewing confirmed for Friday at 10:30."), isDuplicate: false, isDemo: true },
  { id: "demo-4", occurredAt: at(6), source: "Google Ads", sourceSlug: "google-ads", customerName: "Liam O'Connor", email: "liam.oconnor@example.invalid", phone: "+353 83 664 2201", brand: "Peugeot", model: "3008", registrationOrStockNumber: null, county: "Laois", campaign: "Peugeot 3008 Hybrid", salesperson: "Niamh Doyle", salespersonId: "demo-sp-1", status: "Follow-up", notes: note("Considering trade-in; valuation details sent."), isDuplicate: false, isDemo: true },
  { id: "demo-5", occurredAt: at(11), source: "Carzone", sourceSlug: "carzone", customerName: "Mairead Flynn", email: "mairead.flynn@example.invalid", phone: "+353 86 800 9102", brand: "Mazda", model: "CX-5", registrationOrStockNumber: "251-CW-3190", county: "Kildare", campaign: "Mazda Summer Drive", salesperson: null, salespersonId: null, status: "New", notes: [], isDuplicate: false, isDemo: true },
  { id: "demo-6", occurredAt: at(29), source: "Phone", sourceSlug: "phone", customerName: "Declan Reilly", email: null, phone: "+353 59 913 0000", brand: "Škoda", model: "Octavia", registrationOrStockNumber: null, county: "Carlow", campaign: null, salesperson: "Eoin Walsh", salespersonId: "demo-sp-2", status: "Closed", notes: note("Customer purchased elsewhere; close without further follow-up."), isDuplicate: false, isDemo: true }
];

export const demoWorkspaceData: LeadWorkspaceData = {
  leads: demoLeads,
  sources: ["Website", "Carzone", "DoneDeal", "CarsIreland", "Meta Lead Ads", "Google Ads", "Phone", "WhatsApp", "Walk-in", "Other", "Unattributed"].map((name) => ({ id: name.toLowerCase().replace(/[^a-z]+/g, "-"), name })),
  salespeople: [{ id: "demo-sp-1", name: "Niamh Doyle" }, { id: "demo-sp-2", name: "Eoin Walsh" }, { id: "demo-sp-3", name: "Grace Nolan" }],
  brands: ["Škoda", "Volvo", "Peugeot", "Mazda", "Used Cars"].map((name) => ({ id: name.toLowerCase(), name })),
  models: ["Kodiaq", "EX30", "Toyota RAV4", "3008", "CX-5", "Octavia"].map((name) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name })),
  usingDemoData: true
};
