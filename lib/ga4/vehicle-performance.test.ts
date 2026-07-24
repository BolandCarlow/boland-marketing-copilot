import assert from "node:assert/strict";
import test from "node:test";
import { buildVehiclePerformance, parseUsedVehicle } from "./vehicle-performance.ts";
import type { Ga4MarketOpportunitiesData } from "./dashboard.ts";

const row = (pageTitle: string, pagePath: string, pageViews = 10, sessions = 5) => ({ region: "County Carlow", city: "Carlow", pageTitle, pagePath, category: "Used Cars / Skoda" as const, pageViews, activeUsers: 4, sessions, engagedSessions: 3, keyEvents: 1 });
const data = (current: ReturnType<typeof row>[], previous: ReturnType<typeof row>[] = []): Ga4MarketOpportunitiesData => ({ generatedAt: "2026-01-01", propertyId: "1", current, previous });

test("groups matching listings and recalculates engagement", () => { const result = buildVehiclePerformance(data([row("Used 2024 Skoda Kodiaq SUV For Sale", "/vehicle/a", 10, 5), row("Used 2024 Škoda Kodiaq For Sale Carlow", "/vehicle/b", 20, 10)]))!; assert.equal(result.vehicles.length, 1); assert.equal(result.vehicles[0].listings, 2); assert.equal(result.vehicles[0].pageViews, 30); assert.equal(result.vehicles[0].engagementRate, 6 / 15); });
test("keeps years and models separate", () => { const result = buildVehiclePerformance(data([row("Used 2024 Skoda Kodiaq For Sale", "/a"), row("Used 2021 Skoda Kodiaq For Sale", "/b"), row("Used 2024 Skoda Octavia For Sale", "/c")]))!; assert.equal(result.vehicles.length, 3); });
test("normalises franchise models and common non-franchise makes", () => { assert.equal(parseUsedVehicle("Used Mazda CX-5 For Sale", "/vehicle/a")?.model, "CX-5"); assert.equal(parseUsedVehicle("2022 Peugeot 3008 Used Car", "/vehicle/a")?.name, "Used 2022 Peugeot 3008"); assert.equal(parseUsedVehicle("Used Volvo XC60 For Sale", "/vehicle/a")?.model, "XC60"); assert.equal(parseUsedVehicle("Used 2020 Ford Focus For Sale", "/vehicle/a")?.name, "Used 2020 Ford Focus"); });
test("keeps unknown years separate and unclassifies missing models", () => { const unknown = parseUsedVehicle("Used Skoda Kodiaq For Sale", "/vehicle/a")!; assert.match(unknown.name, /Year Unknown/); assert.equal(parseUsedVehicle("Used Skoda For Sale", "/vehicle/a")?.unclassified, true); });
