import { ga4DisplayText } from "./display.ts";

export const pageCategories = ["Volvo", "Skoda", "Peugeot", "Mazda", "Used Cars / Skoda", "Used Cars / Volvo", "Used Cars / Peugeot", "Used Cars / Mazda", "Used Cars / Non-Franchised", "Aftersales", "Other"] as const;
export type PageCategory = (typeof pageCategories)[number];

type Rule = { category: PageCategory; patterns: RegExp[] };

const usedVehiclePatterns = [/\/used(?:-|_)?cars?\b/, /\/used\b/, /pre[-\s]?owned/, /second[-\s]?hand/, /\/stock\/used\b/, /\/vehicle(?:s)?(?:\/|$)/, /\/car-details\b/, /\/search(?:\/|\?|$)/, /\bused\b/, /\bfor sale\b/];
const franchiseMakes: { category: Extract<PageCategory, `Used Cars / ${string}`>; patterns: RegExp[] }[] = [
  { category: "Used Cars / Skoda", patterns: [/\bskoda\b/, /\/skoda(?:\/|$)/, /\boctavia\b/, /\bsuperb\b/, /\bkodiaq\b/, /\bkamiq\b/, /\bfabia\b/, /\benyaq\b/] },
  { category: "Used Cars / Volvo", patterns: [/\bvolvo\b/, /\/volvo(?:\/|$)/, /\bxc\s?(?:40|60|90)\b/, /\bex\s?(?:30|40|90)\b/] },
  { category: "Used Cars / Peugeot", patterns: [/\bpeugeot\b/, /\/peugeot(?:\/|$)/, /\b(?:e-)?20[08]\b/, /\b30[08]\b/, /\b50[08]\b/] },
  { category: "Used Cars / Mazda", patterns: [/\bmazda\b/, /\/mazda(?:\/|$)/, /\bcx[-\s]?(?:30|5|60)\b/, /\bmx[-\s]?5\b/] },
];

// Rules are deliberately based only on public page paths and titles, never visitor-level data.
const rules: Rule[] = [
  { category: "Aftersales", patterns: [/after[-\s]?sales/, /servic(?:e|ing)/, /\/parts?\b/, /body\s?shop/, /repairs?/, /\bmot\b/, /tyres?/, /maintenance/] },
  { category: "Volvo", patterns: franchiseMakes[1].patterns },
  { category: "Skoda", patterns: franchiseMakes[0].patterns },
  { category: "Peugeot", patterns: franchiseMakes[2].patterns },
  { category: "Mazda", patterns: franchiseMakes[3].patterns },
];

export const USED_CATEGORY_LABELS = { used_skoda: "Used Cars / Škoda", used_volvo: "Used Cars / Volvo", used_peugeot: "Used Cars / Peugeot", used_mazda: "Used Cars / Mazda", used_non_franchised: "Used Cars / Non-Franchised" } as const;
type UsedCategoryKey = keyof typeof USED_CATEGORY_LABELS;
const labels: Record<PageCategory, string> = { "Volvo": "Volvo", "Skoda": "Škoda", "Peugeot": "Peugeot", "Mazda": "Mazda", "Used Cars / Skoda": USED_CATEGORY_LABELS.used_skoda, "Used Cars / Volvo": USED_CATEGORY_LABELS.used_volvo, "Used Cars / Peugeot": USED_CATEGORY_LABELS.used_peugeot, "Used Cars / Mazda": USED_CATEGORY_LABELS.used_mazda, "Used Cars / Non-Franchised": USED_CATEGORY_LABELS.used_non_franchised, "Aftersales": "Aftersales", "Other": "Other" };
const badgeTokens: Record<PageCategory, string> = { "Volvo": "volvo", "Skoda": "skoda", "Peugeot": "peugeot", "Mazda": "mazda", "Used Cars / Skoda": "usedcarsskoda", "Used Cars / Volvo": "usedcarsvolvo", "Used Cars / Peugeot": "usedcarspeugeot", "Used Cars / Mazda": "usedcarsmazda", "Used Cars / Non-Franchised": "usedcarsnonfranchised", "Aftersales": "aftersales", "Other": "other" };

function normalise(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }

function usedCategoryKey(value: string): UsedCategoryKey | null {
  const key = normalise(value).replace(/[^a-z]/g, "");
  if (!key.includes("used")) return null;
  if (key.includes("skoda")) return "used_skoda";
  if (key.includes("volvo")) return "used_volvo";
  if (key.includes("peugeot")) return "used_peugeot";
  if (key.includes("mazda")) return "used_mazda";
  return "used_non_franchised";
}

/** Fixed, user-facing labels keep corrupted GA4 strings out of category badges. */
export function categoryLabel(category: PageCategory | string) {
  const cleaned = ga4DisplayText(category, "");
  if (!cleaned) return "—";
  const usedKey = usedCategoryKey(cleaned);
  if (usedKey) return USED_CATEGORY_LABELS[usedKey];
  return labels[cleaned as PageCategory] ?? cleaned;
}

/** Stable CSS token for category badges; never derives text from optional page data. */
export function categoryBadgeToken(category: PageCategory | string) {
  const cleaned = ga4DisplayText(category, "");
  const usedKey = cleaned ? usedCategoryKey(cleaned) : null;
  if (usedKey) return ({ used_skoda: "usedcarsskoda", used_volvo: "usedcarsvolvo", used_peugeot: "usedcarspeugeot", used_mazda: "usedcarsmazda", used_non_franchised: "usedcarsnonfranchised" } as const)[usedKey];
  return badgeTokens[cleaned as PageCategory] ?? "other";
}

export function classifyPage(path: string, title: string): PageCategory {
  const source = `${normalise(path)} ${normalise(title)}`;
  // Used vehicle detection takes precedence over franchise pages, so used Škoda
  // interest is never mixed with new Škoda brand/model interest.
  if (usedVehiclePatterns.some((pattern) => pattern.test(source))) {
    return franchiseMakes.find((make) => make.patterns.some((pattern) => pattern.test(source)))?.category ?? "Used Cars / Non-Franchised";
  }
  return rules.find((rule) => rule.patterns.some((pattern) => pattern.test(source)))?.category ?? "Other";
}
