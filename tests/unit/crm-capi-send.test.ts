import assert from "node:assert/strict";
import { test } from "node:test";

import type { CrmCapiConfig } from "@/lib/crm-capi/config";
import type { CrmMetaEvent } from "@/lib/crm-capi/event";
import { sendCrmEvent, type FetchLike } from "@/lib/crm-capi/send";

const TOKEN = "TEST-ONLY-TOKEN";

const EVENT: CrmMetaEvent = {
  event_name: "QualifiedLead",
  event_time: 1_800_000_000,
  event_id: "crm:qualified:1234567890123456",
  action_source: "system_generated",
  user_data: { lead_id: "1234567890123456" },
  custom_data: { event_source: "crm", lead_event_source: "Fireberry" },
};

const CONFIG: CrmCapiConfig = {
  datasetId: "987654321",
  accessToken: TOKEN,
  graphApiVersion: "v26.0",
  testEventCode: null,
  sendEnabled: true,
};

function fakeFetch(status: number) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return new Response("{}", { status });
  };
  return { fetchImpl, calls };
}

test("without a dataset or a token nothing is sent", async () => {
  const { fetchImpl, calls } = fakeFetch(200);
  const result = await sendCrmEvent(EVENT, { ...CONFIG, datasetId: null }, fetchImpl);
  assert.deepEqual(result, { ok: false, retryable: false, code: "config_missing" });
  assert.equal(calls.length, 0);
});

test("a success posts one event to the CRM dataset and nothing else", async () => {
  const { fetchImpl, calls } = fakeFetch(200);
  assert.deepEqual(await sendCrmEvent(EVENT, CONFIG, fetchImpl), { ok: true });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /^https:\/\/graph\.facebook\.com\/v26\.0\/987654321\/events\?access_token=/);
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), { data: [EVENT] });
});

test("a test event code goes on the request, not inside the event", async () => {
  const { fetchImpl, calls } = fakeFetch(200);
  await sendCrmEvent(EVENT, { ...CONFIG, testEventCode: "TEST12345" }, fetchImpl);
  const body = JSON.parse(String(calls[0].init.body));
  assert.equal(body.test_event_code, "TEST12345");
  assert.deepEqual(body.data, [EVENT]);
});

test("503 and 429 are retryable; another refusal of this event is not", async () => {
  assert.deepEqual(await sendCrmEvent(EVENT, CONFIG, fakeFetch(503).fetchImpl), { ok: false, retryable: true, code: "http_503" });
  assert.deepEqual(await sendCrmEvent(EVENT, CONFIG, fakeFetch(429).fetchImpl), { ok: false, retryable: true, code: "http_429" });
  assert.deepEqual(await sendCrmEvent(EVENT, CONFIG, fakeFetch(400).fetchImpl), { ok: false, retryable: false, code: "http_400" });
});

test("a network error or a timeout is retryable and reports a short code only", async () => {
  const broken: FetchLike = async () => {
    throw new TypeError(`fetch failed for ${TOKEN}`);
  };
  const network = await sendCrmEvent(EVENT, CONFIG, broken);
  assert.deepEqual(network, { ok: false, retryable: true, code: "network" });
  assert.equal(JSON.stringify(network).includes(TOKEN), false);

  const slow: FetchLike = async () => {
    throw new DOMException("timed out", "TimeoutError");
  };
  assert.deepEqual(await sendCrmEvent(EVENT, CONFIG, slow), { ok: false, retryable: true, code: "timeout" });
});

test("a refused event never carries the token out in its result", async () => {
  const result = await sendCrmEvent(EVENT, CONFIG, fakeFetch(400).fetchImpl);
  assert.equal(JSON.stringify(result).includes(TOKEN), false);
});
