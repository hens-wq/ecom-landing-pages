// Demo data is served only when ECOM_DEMO_DATA is exactly "1". Any other value, or no value, means live mode.
import assert from "node:assert/strict";
import { test } from "node:test";

import { DEMO_DATA_ENV_VAR, demoDataEnabled } from "@/lib/runtime-mode";

test("demo data is on only when ECOM_DEMO_DATA is exactly 1", () => {
  const previous = process.env[DEMO_DATA_ENV_VAR];
  try {
    delete process.env[DEMO_DATA_ENV_VAR];
    assert.equal(demoDataEnabled(), false, "no value means live mode");

    process.env[DEMO_DATA_ENV_VAR] = "true";
    assert.equal(demoDataEnabled(), false, "only the exact value 1 turns demo data on");

    process.env[DEMO_DATA_ENV_VAR] = "1";
    assert.equal(demoDataEnabled(), true);
  } finally {
    if (previous === undefined) delete process.env[DEMO_DATA_ENV_VAR];
    else process.env[DEMO_DATA_ENV_VAR] = previous;
  }
});
