export type Ga4Snapshot = { generated_at: string; property_id: string; payload: unknown };

type RecordValue = Record<string, unknown>;
type MetricName = "activeUsers" | "sessions" | "newUsers" | "engagedSessions" | "keyEvents";

export type Ga4Kpi = { key: MetricName | "engagementRate"; label: string; value: number | null; change: number | null };
export type Ga4TrendPoint = { date: string; sessions: number };
export type Ga4Breakdown = { label: string; sessions: number; activeUsers: number; keyEvents: number };
export type Ga4LandingPage = { path: string; sessions: number; engagedSessions: number; keyEvents: number };
export type Ga4DashboardData = {
  generatedAt: string;
  propertyId: string;
  kpis: Ga4Kpi[];
  trend: Ga4TrendPoint[];
  channels: Ga4Breakdown[];
  devices: Ga4Breakdown[];
  landingPages: Ga4LandingPage[];
};
export type Ga4GeographicRow = { country: string; label: string; activeUsers: number; sessions: number; engagedSessions: number; newUsers: number; keyEvents: number };
export type Ga4GeographicData = { generatedAt: string; propertyId: string; countries: Ga4GeographicRow[]; regions: Ga4GeographicRow[]; cities: Ga4GeographicRow[] };

const metricNames: MetricName[] = ["activeUsers", "sessions", "newUsers", "engagedSessions", "keyEvents"];
const kpiLabels: Record<Ga4Kpi["key"], string> = { activeUsers: "Active users", sessions: "Sessions", newUsers: "New users", engagedSessions: "Engaged sessions", keyEvents: "Key events", engagementRate: "Engagement rate" };

function record(value: unknown): RecordValue | null { return value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }

function reportRows(report: unknown) {
  const value = record(report);
  return { rows: array(value?.rows), metricHeaders: array(value?.metricHeaders), dimensionHeaders: array(value?.dimensionHeaders) };
}

function metricIndex(metricHeaders: unknown[], name: string) { return metricHeaders.findIndex((header) => text(record(header)?.name) === name); }
function metricValue(row: unknown, index: number) {
  const values = array(record(row)?.metricValues);
  return index >= 0 ? number(record(values[index])?.value) : 0;
}
function dimensionValue(row: unknown, index = 0) { return text(record(array(record(row)?.dimensionValues)[index])?.value); }

function metricsFromOverall(report: unknown) {
  const { rows, metricHeaders } = reportRows(report); const first = rows[0];
  return Object.fromEntries(metricNames.map((name) => [name, metricValue(first, metricIndex(metricHeaders, name))])) as Record<MetricName, number>;
}

function engagementRate(metrics: Record<MetricName, number>) { return metrics.sessions > 0 ? metrics.engagedSessions / metrics.sessions : null; }
function change(current: number | null, previous: number | null) { return current !== null && previous !== null && previous !== 0 ? (current - previous) / previous : null; }

function formattedDate(value: string) {
  if (!/^\d{8}$/.test(value)) return value;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function breakdown(report: unknown): Ga4Breakdown[] {
  const { rows, metricHeaders } = reportRows(report);
  return rows.map((row) => ({ label: dimensionValue(row) || "Unspecified", sessions: metricValue(row, metricIndex(metricHeaders, "sessions")), activeUsers: metricValue(row, metricIndex(metricHeaders, "activeUsers")), keyEvents: metricValue(row, metricIndex(metricHeaders, "keyEvents")) })).filter((row) => row.label);
}

function landingPages(report: unknown): Ga4LandingPage[] {
  const { rows, metricHeaders } = reportRows(report);
  return rows.map((row) => ({ path: dimensionValue(row) || "Unspecified", sessions: metricValue(row, metricIndex(metricHeaders, "sessions")), engagedSessions: metricValue(row, metricIndex(metricHeaders, "engagedSessions")), keyEvents: metricValue(row, metricIndex(metricHeaders, "keyEvents")) })).filter((row) => row.path);
}

function trend(report: unknown): Ga4TrendPoint[] {
  const { rows, metricHeaders } = reportRows(report);
  return rows.map((row) => ({ date: formattedDate(dimensionValue(row)), sessions: metricValue(row, metricIndex(metricHeaders, "sessions")) })).filter((row) => row.date).sort((a, b) => a.date.localeCompare(b.date));
}

function geographicRows(report: unknown, labelIndex: number): Ga4GeographicRow[] {
  const { rows, metricHeaders } = reportRows(report);
  return rows.map((row) => ({ country: dimensionValue(row, 0), label: dimensionValue(row, labelIndex), activeUsers: metricValue(row, metricIndex(metricHeaders, "activeUsers")), sessions: metricValue(row, metricIndex(metricHeaders, "sessions")), engagedSessions: metricValue(row, metricIndex(metricHeaders, "engagedSessions")), newUsers: metricValue(row, metricIndex(metricHeaders, "newUsers")), keyEvents: metricValue(row, metricIndex(metricHeaders, "keyEvents")) })).filter((row) => row.country && row.label);
}

export function parseGa4Snapshot(snapshot: Ga4Snapshot | null): Ga4DashboardData | null {
  if (!snapshot || !snapshot.generated_at) return null;
  const reports = array(record(snapshot.payload)?.reports);
  if (!reports.length) return null;
  const current = metricsFromOverall(reports[0]); const lastMonth = metricsFromOverall(reports[5]); const previousMonth = metricsFromOverall(reports[6]);
  const currentRate = engagementRate(current); const lastMonthRate = engagementRate(lastMonth); const previousMonthRate = engagementRate(previousMonth);
  const kpis: Ga4Kpi[] = [...metricNames.map((key) => ({ key, label: kpiLabels[key], value: current[key], change: change(lastMonth[key], previousMonth[key]) })), { key: "engagementRate", label: kpiLabels.engagementRate, value: currentRate, change: change(lastMonthRate, previousMonthRate) }];
  return { generatedAt: snapshot.generated_at, propertyId: snapshot.property_id, kpis, channels: breakdown(reports[1]), devices: breakdown(reports[2]), landingPages: landingPages(reports[3]), trend: trend(reports[4]) };
}

export function parseGa4GeographicSnapshot(snapshot: Ga4Snapshot | null): Ga4GeographicData | null {
  if (!snapshot || !snapshot.generated_at) return null;
  const reports = array(record(snapshot.payload)?.reports);
  if (reports.length < 10) return null;
  return { generatedAt: snapshot.generated_at, propertyId: snapshot.property_id, countries: geographicRows(reports[7], 0), regions: geographicRows(reports[8], 1), cities: geographicRows(reports[9], 1) };
}
