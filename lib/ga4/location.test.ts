import assert from "node:assert/strict";
import test from "node:test";
import { formatLocationName, isUnknownLocation } from "./location.ts";

test("formats GA4 county and municipal-district labels for presentation", () => {
  assert.equal(formatLocationName("County Dublin"), "Dublin");
  assert.equal(formatLocationName("Municipal District of Bandon - Kinsale"), "Bandon - Kinsale");
  assert.equal(formatLocationName("County"), "Unknown Location");
  assert.equal(formatLocationName("Municipal District of"), "Unknown Location");
});

test("uses a consistent unknown location fallback", () => {
  assert.equal(formatLocationName("(not set)"), "Unknown Location");
  assert.equal(formatLocationName(undefined), "Unknown Location");
  assert.equal(formatLocationName(null), "Unknown Location");
  assert.equal(isUnknownLocation("(not set)"), true);
});
