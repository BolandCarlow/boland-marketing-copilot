import { ga4DisplayText } from "./display.ts";

const countyPrefix = /^county(?:\s+|$)/i;
const municipalDistrictPrefix = /^municipal\s+district\s+of(?:\s+|$)/i;

/** Formats GA4 location dimensions for presentation without changing stored source data. */
export function formatLocationName(value: unknown, fallback = "Unknown Location") {
  const safeValue = ga4DisplayText(value, "");
  if (!safeValue) return fallback;

  const formatted = safeValue.replace(municipalDistrictPrefix, "").replace(countyPrefix, "").trim();
  return formatted || fallback;
}

export function isUnknownLocation(value: unknown) {
  return formatLocationName(value) === "Unknown Location";
}

/** Normalised display key for presentation-level location matching. */
export function locationNameKey(value: unknown) {
  return formatLocationName(value, "").toLocaleLowerCase("en-IE");
}
