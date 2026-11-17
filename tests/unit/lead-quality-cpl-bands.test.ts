import assert from "node:assert/strict";
import { test } from "node:test";

import { formatCplCurrency, getCplColor } from "@/lib/lead-quality/presentation";

test("CPL display respects the requested inclusive 80 and 120 boundaries at cent precision", () => {
  for (const value of [0, 57, 79.99, 80]) assert.equal(getCplColor(value), "green", String(value));
  for (const value of [80.01, 104, 119.99]) assert.equal(getCplColor(value), "orange", String(value));
  for (const value of [120, 120.01, 500]) assert.equal(getCplColor(value), "red", String(value));
});

test("CPL labels preserve cents and their colour agrees at rounded threshold values", () => {
  assert.match(formatCplCurrency(80.01), /80\.01/);
  assert.match(formatCplCurrency(119.99), /119\.99/);
  assert.equal(getCplColor(80.00000000000001), "green");
  assert.equal(getCplColor(119.999), "red");
  assert.match(formatCplCurrency(119.999), /120/);
  assert.equal(formatCplCurrency(null), "—");
});

test("unavailable, non-finite, and invalid negative CPL is neutral rather than a performance verdict", () => {
  for (const value of [null, undefined, NaN, Infinity, -Infinity, -1]) assert.equal(getCplColor(value), "neutral");
});
