const invalidFragment = /(?:undefined|null|nan)/gi;

/** Converts incomplete GA4 dimension values into safe, human-readable display text. */
export function ga4DisplayText(value: unknown, fallback = "—") {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(invalidFragment, "").replace(/\s{2,}/g, " ").trim();
  if (!cleaned) return fallback;

  // GA4 occasionally repeats a title fragment (for example, "Model | Model").
  const fragments = cleaned.split(/\s*(?:\||·|—)\s*/).map((fragment) => fragment.trim()).filter(Boolean);
  const unique = fragments.filter((fragment, index) => fragments.findIndex((candidate) => candidate.localeCompare(fragment, undefined, { sensitivity: "accent" }) === 0) === index);
  return unique.join(" · ") || fallback;
}
