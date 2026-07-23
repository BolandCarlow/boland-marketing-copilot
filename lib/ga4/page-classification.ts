export const pageCategories = ["Volvo", "Skoda", "Peugeot", "Mazda", "Used Cars", "Aftersales", "Other"] as const;
export type PageCategory = (typeof pageCategories)[number];

type Rule = { category: PageCategory; patterns: RegExp[] };

// Rules are deliberately based only on public page paths and titles, never visitor-level data.
const rules: Rule[] = [
  { category: "Used Cars", patterns: [/\/used(?:-|_)?cars?\b/, /\/used\b/, /pre[-\s]?owned/, /second[-\s]?hand/, /\/stock\/used\b/, /\/vehicle(?:s)?\/used\b/, /\/car-details\b/, /used\s+(?:cars?|vehicles?|stock)/] },
  { category: "Aftersales", patterns: [/after[-\s]?sales/, /servic(?:e|ing)/, /\/parts?\b/, /body\s?shop/, /repairs?/, /\bmot\b/, /tyres?/, /maintenance/] },
  { category: "Volvo", patterns: [/\bvolvo\b/, /\/volvo(?:\/|$)/, /\bxc\s?(?:40|60|90)\b/, /\bex\s?(?:30|40|90)\b/] },
  { category: "Skoda", patterns: [/\bskoda\b/, /\/skoda(?:\/|$)/, /\boctavia\b/, /\bsuperb\b/, /\bkodiaq\b/, /\bkamiq\b/, /\bfabia\b/, /\benyaq\b/] },
  { category: "Peugeot", patterns: [/\bpeugeot\b/, /\/peugeot(?:\/|$)/, /\b(?:e-)?20[08]\b/, /\b30[08]\b/, /\b50[08]\b/] },
  { category: "Mazda", patterns: [/\bmazda\b/, /\/mazda(?:\/|$)/, /\bcx[-\s]?(?:30|5|60)\b/, /\bmx[-\s]?5\b/] }
];

function normalise(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }

export function classifyPage(path: string, title: string): PageCategory {
  const source = `${normalise(path)} ${normalise(title)}`;
  return rules.find((rule) => rule.patterns.some((pattern) => pattern.test(source)))?.category ?? "Other";
}
