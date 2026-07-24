import { ga4DisplayText } from "./display.ts";
import type { Ga4LocationPageInterest, Ga4MarketOpportunitiesData } from "./dashboard";

export type VehicleMetric = "pageViews" | "activeUsers" | "sessions" | "keyEvents";
export type VehicleMetrics = Record<VehicleMetric | "engagedSessions", number>;
export type VehicleListing = VehicleMetrics & { title: string; path: string };
export type VehicleGroup = VehicleMetrics & {
  key: string; name: string; condition: "used"; year: string | null; make: string | null; model: string | null;
  listings: number; listingPages: VehicleListing[]; engagementRate: number | null; shareOfUsedViews: number; change: number | null; unclassified: boolean;
};
export type VehicleBrand = VehicleMetrics & { make: string; groups: number; listings: number; engagementRate: number | null };
export type VehiclePerformanceData = { vehicles: VehicleGroup[]; unclassified: VehicleGroup[]; brands: VehicleBrand[]; totalUsedPageViews: number };

const makes = [
  ["Skoda", "Škoda"], ["Volvo", "Volvo"], ["Peugeot", "Peugeot"], ["Mazda", "Mazda"], ["Ford", "Ford"], ["Volkswagen", "Volkswagen"], ["Audi", "Audi"], ["BMW", "BMW"], ["Mercedes-Benz", "Mercedes-Benz"], ["Toyota", "Toyota"], ["Hyundai", "Hyundai"], ["Kia", "Kia"], ["Nissan", "Nissan"], ["Renault", "Renault"], ["Opel", "Opel"], ["Seat", "SEAT"], ["Cupra", "Cupra"], ["Land Rover", "Land Rover"], ["Lexus", "Lexus"], ["Honda", "Honda"], ["Suzuki", "Suzuki"], ["Citroen", "Citroën"],
] as const;
const franchiseMakes = new Set(["Skoda", "Volvo", "Peugeot", "Mazda"]);
const stopWords = new Set(["for", "sale", "used", "car", "cars", "carlow", "boland", "dealer", "suv", "estate", "saloon", "hatchback", "coupe", "convertible", "automatic", "manual", "diesel", "petrol", "hybrid", "electric", "ev"]);

const number = (value: unknown) => Number.isFinite(value) ? Number(value) : 0;
const zero = (): VehicleMetrics => ({ pageViews: 0, activeUsers: 0, sessions: 0, engagedSessions: 0, keyEvents: 0 });
const metricKeys: (keyof VehicleMetrics)[] = ["pageViews", "activeUsers", "sessions", "engagedSessions", "keyEvents"];
const add = (target: VehicleMetrics, source: VehicleMetrics) => { metricKeys.forEach((key) => { target[key] += source[key]; }); };
const normalise = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9-]+/g, " ").replace(/\s+/g, " ").trim();
const title = (value: unknown, fallback = "—") => ga4DisplayText(value, fallback);
const metrics = (row: Ga4LocationPageInterest): VehicleMetrics => ({ pageViews: number(row.pageViews), activeUsers: number(row.activeUsers), sessions: number(row.sessions), engagedSessions: number(row.engagedSessions), keyEvents: number(row.keyEvents) });

export function isFranchiseMake(make: string | null) { return make ? franchiseMakes.has(make) : false; }

export function parseUsedVehicle(titleValue: unknown, pathValue: unknown) {
  const cleanTitle = title(titleValue, ""); const cleanPath = title(pathValue, "");
  const source = normalise(`${cleanTitle} ${cleanPath}`);
  const used = /\bused\b|\bpre owned\b|\bsecond hand\b|\/vehicle\b|\/used\b|\/search\b/.test(source);
  if (!used) return null;
  const year = source.match(/\b(?:19|20)\d{2}\b/)?.[0] ?? null;
  const matchedMake = makes.find(([key]) => new RegExp(`\\b${normalise(key).replace(/ /g, "\\s+")}\\b`).test(source));
  if (!matchedMake) return { key: `unclassified|${normalise(cleanPath || cleanTitle)}`, name: "Unclassified Used Vehicle", condition: "used" as const, year, make: null, model: null, unclassified: true };
  const [makeKey, make] = matchedMake;
  const makePosition = source.search(new RegExp(`\\b${normalise(makeKey).replace(/ /g, "\\s+")}\\b`));
  const afterMake = source.slice(Math.max(0, makePosition + normalise(makeKey).length)).trim().split(" ");
  const modelTokens: string[] = [];
  for (const token of afterMake) { if (!token || stopWords.has(token) || /^(?:19|20)\d{2}$/.test(token)) break; modelTokens.push(token); if (modelTokens.length === 3) break; }
  const modelKey = modelTokens.join(" ");
  if (!modelKey) return { key: `unclassified|${normalise(cleanPath || cleanTitle)}`, name: "Unclassified Used Vehicle", condition: "used" as const, year, make: null, model: null, unclassified: true };
  const model = modelKey.replace(/\bxc[-\s]?(\d+)\b/g, "XC$1").replace(/\bcx[-\s]?(\d+)\b/g, "CX-$1").replace(/\b[a-z]/g, (character) => character.toUpperCase());
  const name = year ? `Used ${year} ${make} ${model}` : `Used ${make} ${model} — Year Unknown`;
  return { key: `used|${year ?? "unknown"}|${normalise(makeKey)}|${normalise(modelKey)}`, name, condition: "used" as const, year, make: makeKey, model, unclassified: false };
}

type MutableGroup = VehicleGroup & { listingMap: Map<string, VehicleListing>; seenRows: Set<string> };
function buildGroups(rows: Ga4LocationPageInterest[]) {
  const groups = new Map<string, MutableGroup>();
  for (const row of rows) {
    const parsed = parseUsedVehicle(row.pageTitle, row.pagePath); if (!parsed) continue;
    const rowKey = `${row.region}|${row.city}|${row.pagePath}|${row.pageTitle}`; const listingKey = `${title(row.pagePath, "")}|${title(row.pageTitle, "")}`;
    const group = groups.get(parsed.key) ?? { ...zero(), ...parsed, listings: 0, listingPages: [], engagementRate: null, shareOfUsedViews: 0, change: null, listingMap: new Map(), seenRows: new Set() };
    const isNewRow = !group.seenRows.has(rowKey);
    if (isNewRow) { add(group, metrics(row)); group.seenRows.add(rowKey); }
    const listing = group.listingMap.get(listingKey) ?? { ...zero(), title: title(row.pageTitle, "Untitled listing"), path: title(row.pagePath, "—") };
    if (!group.listingMap.has(listingKey)) group.listings += 1;
    if (isNewRow) add(listing, metrics(row)); group.listingMap.set(listingKey, listing); groups.set(parsed.key, group);
  }
  return groups;
}

export function buildVehiclePerformance(data: Ga4MarketOpportunitiesData | null): VehiclePerformanceData | null {
  if (!data) return null;
  const current = buildGroups(data.current); const previous = buildGroups(data.previous); const totalUsedPageViews = [...current.values()].reduce((sum, group) => sum + group.pageViews, 0);
  const groups = [...current.values()].map((group) => {
    const previousViews = previous.get(group.key)?.pageViews ?? 0;
    return { ...group, listingPages: [...group.listingMap.values()].sort((a, b) => b.pageViews - a.pageViews), engagementRate: group.sessions > 0 ? group.engagedSessions / group.sessions : null, shareOfUsedViews: totalUsedPageViews > 0 ? group.pageViews / totalUsedPageViews : 0, change: previousViews > 0 ? (group.pageViews - previousViews) / previousViews : null };
  });
  const valid = groups.filter((group) => !group.unclassified).sort((a, b) => b.pageViews - a.pageViews); const unclassified = groups.filter((group) => group.unclassified).sort((a, b) => b.pageViews - a.pageViews);
  const brandMap = new Map<string, VehicleBrand>();
  for (const group of valid) {
    const make = group.make ?? "Other"; const brand = brandMap.get(make) ?? { ...zero(), make, groups: 0, listings: 0, engagementRate: null };
    add(brand, group); brand.groups += 1; brand.listings += group.listings; brandMap.set(make, brand);
  }
  const brands = [...brandMap.values()].map((brand) => ({ ...brand, engagementRate: brand.sessions > 0 ? brand.engagedSessions / brand.sessions : null })).sort((a, b) => b.pageViews - a.pageViews);
  return { vehicles: valid, unclassified, brands, totalUsedPageViews };
}
