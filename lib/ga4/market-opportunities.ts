import { pageCategories, type PageCategory } from "./page-classification";
import type { Ga4LocationPageInterest } from "./dashboard";

export type InterestMetric = "pageViews" | "activeUsers" | "sessions" | "keyEvents";
export type InterestMetrics = Record<InterestMetric | "engagedSessions", number>;
export type CategoryInterest = InterestMetrics & { category: PageCategory };
export type PageInterest = InterestMetrics & { category: PageCategory; pagePath: string; pageTitle: string; change: number | null };
export type CountyInterest = { county: string; totals: InterestMetrics; categories: CategoryInterest[]; pages: PageInterest[] };
export type Opportunity = CountyInterest & { category: CategoryInterest; countyShare: number; nationalShare: number; shareDifference: number; change: number | null; engagementRate: number | null };

export const marketCategories = pageCategories.filter((category) => category !== "Other");
// These thresholds suppress small, volatile samples from opportunity cards and automatic insights.
export const MIN_COUNTY_CLASSIFIED_PAGE_VIEWS = 50;
export const MIN_CATEGORY_PAGE_VIEWS = 20;
export const MIN_COMPARISON_PAGE_VIEWS = 20;
export const MIN_SHARE_DIFFERENCE = 0.1;
export const MIN_GROWTH = 0.2;
export const MIN_KEY_EVENTS = 5;

const zero = (): InterestMetrics => ({ pageViews: 0, activeUsers: 0, sessions: 0, engagedSessions: 0, keyEvents: 0 });
const add = (target: InterestMetrics, source: InterestMetrics) => { (Object.keys(target) as (keyof InterestMetrics)[]).forEach((key) => { target[key] += source[key]; }); };
const metrics = (row: Ga4LocationPageInterest): InterestMetrics => ({ pageViews: row.pageViews, activeUsers: row.activeUsers, sessions: row.sessions, engagedSessions: row.engagedSessions, keyEvents: row.keyEvents });
const keyForPage = (row: Ga4LocationPageInterest) => `${row.category}|${row.pagePath}|${row.pageTitle}`;

function normaliseCounty(value: string) { return value.toLowerCase().replace(/^county\s+/, "").replace(/\s+county$/, "").trim(); }

export function aggregateCountyInterest(rows: Ga4LocationPageInterest[]): CountyInterest[] {
  const counties = new Map<string, { county: string; totals: InterestMetrics; categories: Map<PageCategory, InterestMetrics>; pages: Map<string, PageInterest> }>();
  rows.filter((row) => row.category !== "Other" && row.region !== "Unknown location").forEach((row) => {
    const county = normaliseCounty(row.region); if (!county) return;
    const entry = counties.get(county) ?? { county: row.region, totals: zero(), categories: new Map(), pages: new Map() };
    const rowMetrics = metrics(row); add(entry.totals, rowMetrics);
    const categoryMetrics = entry.categories.get(row.category) ?? zero(); add(categoryMetrics, rowMetrics); entry.categories.set(row.category, categoryMetrics);
    const pageKey = keyForPage(row); const page = entry.pages.get(pageKey) ?? { ...rowMetrics, category: row.category, pagePath: row.pagePath, pageTitle: row.pageTitle || "Untitled page", change: null };
    if (entry.pages.has(pageKey)) add(page, rowMetrics); entry.pages.set(pageKey, page); counties.set(county, entry);
  });
  return [...counties.values()].map((entry) => ({ county: entry.county, totals: entry.totals, categories: marketCategories.map((category) => ({ category, ...(entry.categories.get(category) ?? zero()) })), pages: [...entry.pages.values()] }));
}

function categoryFor(county: CountyInterest, category: PageCategory) { return county.categories.find((item) => item.category === category) ?? { category, ...zero() }; }
function ratio(value: number, denominator: number) { return denominator > 0 ? value / denominator : null; }
function change(current: number, previous: number) { return previous >= MIN_COMPARISON_PAGE_VIEWS ? (current - previous) / previous : null; }

export function buildOpportunities(currentRows: Ga4LocationPageInterest[], previousRows: Ga4LocationPageInterest[]) {
  const counties = aggregateCountyInterest(currentRows); const previous = aggregateCountyInterest(previousRows); const previousByCounty = new Map(previous.map((county) => [normaliseCounty(county.county), county]));
  const nationalTotals = counties.reduce((total, county) => { add(total, county.totals); return total; }, zero());
  const nationalCategories = marketCategories.map((category) => counties.reduce((total, county) => { add(total, categoryFor(county, category)); return total; }, zero()));
  const nationalByCategory = new Map(nationalCategories.map((item, index) => [marketCategories[index], item]));
  const opportunities: Opportunity[] = counties.flatMap((county) => marketCategories.map((category) => {
    const categoryMetrics = categoryFor(county, category); const previousMetrics = categoryFor(previousByCounty.get(normaliseCounty(county.county)) ?? { county: "", totals: zero(), categories: [], pages: [] }, category); const countyShare = ratio(categoryMetrics.pageViews, county.totals.pageViews) ?? 0; const nationalShare = ratio((nationalByCategory.get(category) ?? zero()).pageViews, nationalTotals.pageViews) ?? 0;
    return { ...county, category: categoryMetrics, countyShare, nationalShare, shareDifference: countyShare - nationalShare, change: change(categoryMetrics.pageViews, previousMetrics.pageViews), engagementRate: ratio(categoryMetrics.engagedSessions, categoryMetrics.sessions) };
  })).filter((item) => item.totals.pageViews >= MIN_COUNTY_CLASSIFIED_PAGE_VIEWS && item.category.pageViews >= MIN_CATEGORY_PAGE_VIEWS).sort((a, b) => Math.max(b.shareDifference, b.change ?? 0) - Math.max(a.shareDifference, a.change ?? 0));
  const previousPages = new Map(previousRows.map((row) => [`${normaliseCounty(row.region)}|${keyForPage(row)}`, row]));
  const pagesWithChanges = counties.map((county) => ({ ...county, pages: county.pages.map((page) => ({ ...page, change: change(page.pageViews, previousPages.get(`${normaliseCounty(county.county)}|${page.category}|${page.pagePath}|${page.pageTitle}`)?.pageViews ?? 0) })) }));
  return { counties: pagesWithChanges, previous, nationalTotals, nationalByCategory, opportunities };
}
