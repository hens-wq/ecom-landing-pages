import assert from "node:assert/strict";
import { test } from "node:test";

import { readCrmCapiConfig } from "@/lib/crm-capi/config";
import { CRM_MAX_ATTEMPTS, isTooOld, retryDelaySeconds } from "@/lib/crm-capi/policy";

const READY = { META_CRM_DATASET_ID: "987654321", META_CRM_ACCESS_TOKEN: "TEST-ONLY-TOKEN" };

test("sending is off by default and needs the flag set to true, the CRM dataset and the CRM token", () => {
  assert.equal(readCrmCapiConfig({}).sendEnabled, false);
  assert.equal(readCrmCapiConfig({ ...READY }).sendEnabled, false);
  assert.equal(readCrmCapiConfig({ ...READY, META_CAPI_CRM_SEND_ENABLED: "false" }).sendEnabled, false);
  assert.equal(readCrmCapiConfig({ META_CAPI_CRM_SEND_ENABLED: "true", META_CRM_ACCESS_TOKEN: "t" }).sendEnabled, false);
  assert.equal(readCrmCapiConfig({ META_CAPI_CRM_SEND_ENABLED: "true", META_CRM_DATASET_ID: "d" }).sendEnabled, false);
  assert.equal(readCrmCapiConfig({ ...READY, META_CAPI_CRM_SEND_ENABLED: "true" }).sendEnabled, true);
});

test("the CRM path uses its own token and dataset, with no fallback to the website pixel's token", () => {
  const websiteOnly = {
    META_CAPI_CRM_SEND_ENABLED: "true",
    META_CRM_DATASET_ID: "987654321",
    META_CAPI_ACCESS_TOKEN: "website-token",
    META_PIXEL_ID: "111111111111111",
  };
  const withoutCrmToken = readCrmCapiConfig(websiteOnly);
  assert.equal(withoutCrmToken.accessToken, null);
  assert.equal(withoutCrmToken.sendEnabled, false);

  const withCrmToken = readCrmCapiConfig({ ...websiteOnly, META_CRM_ACCESS_TOKEN: "crm-token" });
  assert.equal(withCrmToken.accessToken, "crm-token");
  assert.equal(withCrmToken.datasetId, "987654321");
  assert.equal(withCrmToken.sendEnabled, true);
});

test("the dataset comes only from META_CRM_DATASET_ID, never from the website pixel", () => {
  const pixelOnly = { META_CAPI_CRM_SEND_ENABLED: "true", META_CRM_ACCESS_TOKEN: "crm-token", META_PIXEL_ID: "111111111111111" };
  const config = readCrmCapiConfig(pixelOnly);
  assert.equal(config.datasetId, null);
  assert.equal(config.sendEnabled, false);
});

test("the website Lead switch does not turn on CRM sending", () => {
  assert.equal(readCrmCapiConfig({ ...READY, META_CAPI_SEND_ENABLED: "true" }).sendEnabled, false);
});

test("the Graph API version defaults to v26.0 and the test code is optional", () => {
  const config = readCrmCapiConfig({ ...READY });
  assert.equal(config.graphApiVersion, "v26.0");
  assert.equal(config.testEventCode, null);
});

test("retries back off 1, 5 and 30 minutes, then 2 and 6 hours, and stop at six attempts", () => {
  assert.equal(CRM_MAX_ATTEMPTS, 6);
  assert.deepEqual([1, 2, 3, 4, 5].map((attempts) => retryDelaySeconds(attempts)), [60, 300, 1800, 7200, 21600]);
  assert.equal(retryDelaySeconds(6), null);
});

test("an event older than seven days is too old; exactly seven days is not", () => {
  const now = new Date("2026-11-16T10:00:00Z");
  const day = 24 * 60 * 60 * 1000;
  assert.equal(isTooOld(new Date(now.getTime() - 7 * day), now), false);
  assert.equal(isTooOld(new Date(now.getTime() - 7 * day - 1), now), true);
});
