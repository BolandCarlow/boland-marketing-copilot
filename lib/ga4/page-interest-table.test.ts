import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("page-interest titles are scoped to the table rather than using display-heading styles", () => {
  const styles = readFileSync("app/dashboard/market-intelligence/market-opportunities.module.css", "utf8");
  assert.match(styles, /page-interest-table \.page-title/);
  assert.match(styles, /font-size: 15px/);
  assert.match(styles, /-webkit-line-clamp: 3/);
});
