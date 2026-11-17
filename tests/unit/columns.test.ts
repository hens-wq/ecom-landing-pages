// The default column order: status (fixed), then spend, leads, CPL, sales and cost per registration, then the rest.
import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_VISIBLE_COLUMN_KEYS, PERFORMANCE_COLUMNS } from "@/lib/columns";

test("the default order starts with spend, leads, CPL, sales and cost per registration", () => {
  const keys = PERFORMANCE_COLUMNS.map((column) => column.key);
  assert.deepEqual(keys.slice(0, 5), ["spend", "leads", "cpl", "sales", "costPerSale"]);
});

test("every metric column is still visible by default, and no column is lost in the reorder", () => {
  const keys = PERFORMANCE_COLUMNS.map((column) => column.key);
  assert.equal(new Set(keys).size, keys.length, "no column appears twice");
  assert.equal(keys.length, 15);
  assert.equal(DEFAULT_VISIBLE_COLUMN_KEYS.size, 15);
});
