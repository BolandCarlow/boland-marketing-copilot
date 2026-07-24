import assert from "node:assert/strict";
import test from "node:test";
import { ga4DisplayText } from "./display.ts";
import { categoryLabel } from "./page-classification.ts";
import { visibleTableRows } from "./table-display.ts";

test("cleans invalid fragments and repeated page titles", () => {
  assert.equal(ga4DisplayText("Used Carsundefined"), "Used Cars");
  assert.equal(ga4DisplayText("/searchundefined"), "/search");
  assert.equal(ga4DisplayText("Kodiaq | Kodiaq"), "Kodiaq");
  assert.equal(ga4DisplayText("(not set)", "Unknown"), "Unknown");
});

test("uses the exact used vehicle category labels", () => {
  assert.equal(categoryLabel("Used Cars / Skoda"), "Used Cars / Škoda");
  assert.equal(categoryLabel("Used Cars / Volvo"), "Used Cars / Volvo");
  assert.equal(categoryLabel("Used Cars / Peugeot"), "Used Cars / Peugeot");
  assert.equal(categoryLabel("Used Cars / Mazda"), "Used Cars / Mazda");
  assert.equal(categoryLabel("Used Cars / Non-Franchised"), "Used Cars / Non-Franchised");
});

test("shows five rows until a table is expanded and returns to five when collapsed", () => {
  const rows = [1, 2, 3, 4, 5, 6, 7];
  assert.deepEqual(visibleTableRows(rows, false), [1, 2, 3, 4, 5]);
  assert.deepEqual(visibleTableRows(rows, true), rows);
  assert.deepEqual(visibleTableRows(rows, false), [1, 2, 3, 4, 5]);
});
