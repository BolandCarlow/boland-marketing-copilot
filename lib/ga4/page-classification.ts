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

const labels: Record<PageCategory, string> = { "Volvo": "Volvo", "Skoda": "Škoda", "Peugeot": "Peugeot", "Mazda": "Mazda", "Used Cars / Skoda": "Used Cars / Škoda", "Used Cars / Volvo": "Used Cars / Volvo", "Used Cars / Peugeot": "Used Cars / Peugeot", "Used Cars / Mazda": "Used Cars / Mazda", "Used Cars / Non-Franchised": "Used Cars / Non-Franchised", "Aftersales": "Aftersales", "Other": "Other" };

function normalise(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }

export function categoryLabel(category: PageCategory | string) { return labels[category as PageCategory] ?? category; }

export function classifyPage(path: string, title: string): PageCategory {
  const source = `${normalise(path)} ${normalise(title)}`;
  // Used vehicle detection takes precedence over franchise pages, so used Škoda
  // interest is never mixed with new Škoda brand/model interest.
  if (usedVehiclePatterns.some((pattern) => pattern.test(source))) {
    return franchiseMakes.find((make) => make.patterns.some((pattern) => pattern.test(source)))?.category ?? "Used Cars / Non-Franchised";
  }
  return rules.find((rule) => rule.patterns.some((pattern) => pattern.test(source)))?.category ?? "Other";
}
