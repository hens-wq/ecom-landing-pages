import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import {
  MIN_DRY_RUN_SECRET_LENGTH,
  checkDryRunAuthorization,
  configFlags,
  runDryRunRequest,
  type DryRunAuthResult,
} from "@/lib/crm-capi/dry-run-handler";
import {
  CRM_DATASET_SWITCHED_AT,
  buildDryRunReport,
  mergeDryRunLeads,
  type DryRunLead,
  type DryRunOutboxRow,
} from "@/lib/crm-capi/dry-run";
import type { LeadQualitySnapshot } from "@/lib/crm-capi/rules";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-11-18T12:00:00Z");
const ago = (days: number): Date => new Date(NOW.getTime() - days * DAY);
const SENT_AFTER_SWITCH = new Date(CRM_DATASET_SWITCHED_AT.getTime() + 60 * 60 * 1000);
const SENT_BEFORE_SWITCH = new Date("2026-11-16T10:00:00Z");
const CONFIG = { sendingEnabled: false, crmDatasetConfigured: true, crmTokenConfigured: true };

const IN_PROCESS: LeadQualitySnapshot = { mainStatus: "בתהליך", secondaryStatus: "בתהליך", studentRating: null };
const ENROLLED: LeadQualitySnapshot = { mainStatus: "נרשם", secondaryStatus: "נרשם", studentRating: null };
const FUTURE_REASON: LeadQualitySnapshot = { mainStatus: "לא מעוניין", secondaryStatus: 'ל"מ - פוטנציאל עתידי', studentRating: null };
const PRICE_REASON: LeadQualitySnapshot = { mainStatus: "לא מעוניין", secondaryStatus: 'ל"מ - מחיר יקר', studentRating: null };
const NOT_ANSWERING: LeadQualitySnapshot = { mainStatus: "אין מענה", secondaryStatus: "אין מענה", studentRating: null };

const VERIFIED_RECRUITMENT_ID = "120248773681350125";
const OTHER_RECRUITMENT_ID = "120999999999999999";
const KEYS = { a: "900000000000001", b: "900000000000002", c: "900000000000003", d: "900000000000004", e: "900000000000005" };
const LANDING_KEY = "lp_7f3c9a2e5b1d4c6a";

function lead(leadKey: string, overrides: Partial<DryRunLead> = {}): DryRunLead {
  return {
    leadKey,
    hasLeadRecord: true,
    campaignId: "120000000000001",
    campaignName: "קורס | דיגיטל",
    landingMetaLeadId: null,
    status: IN_PROCESS,
    statusUpdatedAt: ago(1),
    ...overrides,
  };
}

function outboxRow(
  leadKey: string,
  eventType: DryRunOutboxRow["eventType"],
  status: DryRunOutboxRow["status"],
  overrides: Partial<DryRunOutboxRow> = {}
): DryRunOutboxRow {
  return { leadKey, eventType, status, eventTime: ago(1), sentAt: null, lastError: null, ...overrides };
}

function run(leads: DryRunLead[], outbox: DryRunOutboxRow[] = []) {
  return buildDryRunReport({ now: NOW, switchAt: CRM_DATASET_SWITCHED_AT, leads, outbox, config: CONFIG });
}

test("no outbox row and a recent last write: the progression date is unknown, so the lead is not sent", () => {
  const report = run([lead(KEYS.a, { statusUpdatedAt: ago(2) })]);
  assert.equal(report.qualifyingLeads.total, 1);
  assert.equal(report.qualifyingLeads.buckets.missingReliableDate, 1);
  assert.equal(report.qualifyingLeads.buckets.sendable, 0);
  assert.equal(report.qualifyingLeads.withVerifiedDateInWindow, 0);
});

test("a last write older than the window proves the change is too old, not merely unknown", () => {
  const report = run([lead(KEYS.a, { statusUpdatedAt: ago(9) })]);
  assert.equal(report.qualifyingLeads.buckets.tooOld, 1);
  assert.equal(report.qualifyingLeads.buckets.missingReliableDate, 0);
});

test("the seven-day boundary: exactly seven days is not proven old, one millisecond more is", () => {
  assert.equal(run([lead(KEYS.a, { statusUpdatedAt: ago(7) })]).qualifyingLeads.buckets.missingReliableDate, 1);
  assert.equal(run([lead(KEYS.a, { statusUpdatedAt: new Date(ago(7).getTime() - 1) })]).qualifyingLeads.buckets.tooOld, 1);
});

test("a pending outbox row inside the window is sendable, and its own time is the verified date", () => {
  const report = run([lead(KEYS.a)], [outboxRow(KEYS.a, "qualified", "pending", { eventTime: ago(1) })]);
  assert.equal(report.qualifyingLeads.buckets.sendable, 1);
  assert.equal(report.qualifyingLeads.withVerifiedDateInWindow, 1);
  assert.equal(report.outbox.queued, 1);
});

test("a queued row older than the window is too old, even when the last write is recent", () => {
  const report = run(
    [lead(KEYS.a, { statusUpdatedAt: ago(1) })],
    [outboxRow(KEYS.a, "qualified", "retry", { eventTime: ago(8) })]
  );
  assert.equal(report.qualifyingLeads.buckets.tooOld, 1);
  assert.equal(report.qualifyingLeads.withVerifiedDateInWindow, 0);
});

test("a row sent after the switch is already sent to the CRM dataset and never sendable again", () => {
  const report = run([lead(KEYS.a)], [outboxRow(KEYS.a, "qualified", "sent", { sentAt: SENT_AFTER_SWITCH })]);
  assert.equal(report.qualifyingLeads.buckets.alreadySentToCrm, 1);
  assert.equal(report.qualifyingLeads.buckets.sendable, 0);
  assert.equal(report.outbox.sentToCrmDataset, 1);
  assert.equal(report.outbox.sentBeforeSwitch, 0);
});

test("a row sent before the switch is reported apart, never as sent to the CRM dataset", () => {
  const report = run([lead(KEYS.a)], [outboxRow(KEYS.a, "qualified", "sent", { sentAt: SENT_BEFORE_SWITCH })]);
  assert.equal(report.qualifyingLeads.buckets.sentBeforeSwitch, 1);
  assert.equal(report.qualifyingLeads.buckets.sendable, 0);
  assert.equal(report.outbox.sentBeforeSwitch, 1);
  assert.equal(report.outbox.sentToCrmDataset, 0);
});

test("recruitment campaigns are excluded by verified ID and by name, and listed for checking", () => {
  const report = run(
    [
      lead(KEYS.a, { campaignId: VERIFIED_RECRUITMENT_ID, campaignName: "דרושים | אנשי מכירות" }),
      lead(KEYS.b, { campaignId: OTHER_RECRUITMENT_ID, campaignName: "דרושים | רכזת גיוס" }),
    ],
    [outboxRow(KEYS.a, "qualified", "pending")]
  );
  assert.equal(report.qualifyingLeads.buckets.excluded, 2);
  assert.equal(report.qualifyingLeads.buckets.sendable, 0);
  const verified = report.recruitmentCampaigns.find((campaign) => campaign.campaignId === VERIFIED_RECRUITMENT_ID);
  const byName = report.recruitmentCampaigns.find((campaign) => campaign.campaignId === OTHER_RECRUITMENT_ID);
  assert.equal(verified?.verifiedId, true);
  assert.equal(byName?.verifiedId, false);
});

test("a lead with uncertain attribution is excluded from sending, including a status row with no lead record", () => {
  const report = run(
    [
      lead(KEYS.a, { campaignId: null, campaignName: null }),
      lead(KEYS.b, { hasLeadRecord: false, campaignId: null, campaignName: null }),
    ],
    [outboxRow(KEYS.a, "qualified", "pending")]
  );
  assert.equal(report.qualifyingLeads.buckets.excluded, 2);
  assert.equal(report.qualifyingLeads.buckets.sendable, 0);
  assert.equal(report.scanned.orphanStatusRows, 1);
});

test("a landing lead has no Meta Lead ID, so it is never sent, and its stored Meta ID is flagged", () => {
  const report = run(
    [lead(LANDING_KEY, { landingMetaLeadId: KEYS.c })],
    [outboxRow(LANDING_KEY, "qualified", "pending")]
  );
  assert.equal(report.qualifyingLeads.buckets.missingMetaLeadId, 1);
  assert.equal(report.qualifyingLeads.buckets.sendable, 0);
  assert.equal(report.flags.landingLeadsWithValidStoredMetaLeadId, 1);
});

test("the rules decide who counts: the named reason, enrolled, a rating of 4 but not 3, and not the rest of לא מעוניין", () => {
  const report = run([
    lead(KEYS.a, { status: PRICE_REASON }),
    lead(KEYS.b, { status: FUTURE_REASON }),
    lead(KEYS.c, { status: ENROLLED }),
    lead(KEYS.d, { status: { mainStatus: "חדש", secondaryStatus: "חדש", studentRating: 4 } }),
    lead(KEYS.e, { status: { mainStatus: "חדש", secondaryStatus: "חדש", studentRating: 3 } }),
  ]);
  assert.equal(report.scanned.statusRows, 5);
  assert.equal(report.qualifyingLeads.total, 3);
  assert.equal(report.registeredLeads.total, 1);
});

test("RegisteredLead is judged by its own row: a sent QualifiedLead does not stand in for it", () => {
  const report = run(
    [lead(KEYS.c, { status: ENROLLED, statusUpdatedAt: ago(2) })],
    [outboxRow(KEYS.c, "qualified", "sent", { sentAt: SENT_AFTER_SWITCH })]
  );
  assert.equal(report.qualifyingLeads.buckets.alreadySentToCrm, 1);
  assert.equal(report.registeredLeads.buckets.missingReliableDate, 1);
});

test("an event queued for a lead that no longer qualifies is flagged, and is not counted as a qualifying lead", () => {
  const report = run([lead(KEYS.a, { status: NOT_ANSWERING })], [outboxRow(KEYS.a, "qualified", "pending")]);
  assert.equal(report.qualifyingLeads.total, 0);
  assert.equal(report.outbox.queued, 1);
  assert.equal(report.flags.queuedForLeadsNoLongerQualifying, 1);
});

test("an event skipped as too old is too old; one that failed at Meta is reported as failed", () => {
  const report = run(
    [lead(KEYS.a), lead(KEYS.b)],
    [
      outboxRow(KEYS.a, "qualified", "skipped", { lastError: "event_too_old" }),
      outboxRow(KEYS.b, "qualified", "failed", { lastError: "meta_error" }),
    ]
  );
  assert.equal(report.qualifyingLeads.buckets.tooOld, 1);
  assert.equal(report.qualifyingLeads.buckets.failedOrSkipped, 1);
  assert.equal(report.outbox.failed, 1);
  assert.equal(report.outbox.skippedEventTooOld, 1);
});

test("an event time in the future (clock skew) is sendable, not refused", () => {
  const report = run(
    [lead(KEYS.a)],
    [outboxRow(KEYS.a, "qualified", "pending", { eventTime: new Date(NOW.getTime() + 60 * 60 * 1000) })]
  );
  assert.equal(report.qualifyingLeads.buckets.sendable, 1);
});

test("the report names no lead: no lead ID appears in its text", () => {
  const text = JSON.stringify(
    run([lead(KEYS.a), lead(LANDING_KEY, { landingMetaLeadId: KEYS.c })], [outboxRow(KEYS.a, "qualified", "pending")])
  );
  for (const id of [KEYS.a, KEYS.c, LANDING_KEY]) assert.equal(text.includes(id), false, "a lead ID leaked into the report");
});

test("merging: a landing lead takes its campaign name from a Meta lead with the same ID; a status row with no lead is kept", () => {
  const merged = mergeDryRunLeads({
    meta: [{ id: KEYS.a, campaignId: VERIFIED_RECRUITMENT_ID, campaignName: "דרושים | אנשי מכירות" }],
    landing: [{ internalLeadId: "lp_1", campaignId: VERIFIED_RECRUITMENT_ID, metaLeadId: null }],
    statusRows: [
      { leadId: "lp_1", mainStatus: "בתהליך", secondaryStatus: "בתהליך", studentRating: null, updatedAt: ago(1).toISOString() },
      { leadId: "orphan-1", mainStatus: "נרשם", secondaryStatus: "נרשם", studentRating: null, updatedAt: ago(1).toISOString() },
    ],
  });
  const landing = merged.find((entry) => entry.leadKey === "lp_1");
  assert.equal(landing?.campaignName, "דרושים | אנשי מכירות");
  assert.equal(landing?.hasLeadRecord, true);
  assert.equal(merged.find((entry) => entry.leadKey === "orphan-1")?.hasLeadRecord, false);
});

const SECRET = "s".repeat(MIN_DRY_RUN_SECRET_LENGTH);
const statusOf = (result: DryRunAuthResult): number => (result.ok ? 200 : result.status);

test("auth: no secret or a short one is a 503; a missing or wrong token is a 401; the right one passes", () => {
  assert.equal(statusOf(checkDryRunAuthorization(`Bearer ${SECRET}`, undefined)), 503);
  assert.equal(statusOf(checkDryRunAuthorization("Bearer short", "short")), 503);
  assert.equal(statusOf(checkDryRunAuthorization(null, SECRET)), 401);
  assert.equal(statusOf(checkDryRunAuthorization(`Basic ${SECRET}`, SECRET)), 401);
  assert.equal(statusOf(checkDryRunAuthorization(`Bearer ${"t".repeat(MIN_DRY_RUN_SECRET_LENGTH)}`, SECRET)), 401);
  assert.equal(statusOf(checkDryRunAuthorization(`Bearer ${"s".repeat(MIN_DRY_RUN_SECRET_LENGTH - 1)}`, SECRET)), 401);
  assert.deepEqual(checkDryRunAuthorization(`Bearer ${SECRET}`, SECRET), { ok: true });
});

const requestWith = (authorization?: string): Request =>
  new Request("https://example.test/api/admin/crm-capi/dry-run", { headers: authorization ? { authorization } : {} });

test("handler: no secret configured means 503 and nothing is read", async () => {
  let loads = 0;
  const response = await runDryRunRequest(requestWith(`Bearer ${SECRET}`), {
    env: {},
    now: () => NOW,
    loadInput: async () => {
      loads += 1;
      return { ok: true, leads: [], outbox: [] };
    },
  });
  assert.equal(response.status, 503);
  assert.equal(loads, 0);
});

test("handler: a wrong token is a 401 and nothing is read", async () => {
  let loads = 0;
  const response = await runDryRunRequest(requestWith("Bearer wrong"), {
    env: { CRM_CAPI_DRY_RUN_SECRET: SECRET },
    now: () => NOW,
    loadInput: async () => {
      loads += 1;
      return { ok: true, leads: [], outbox: [] };
    },
  });
  assert.equal(response.status, 401);
  assert.equal(loads, 0);
});

test("handler: when Meta cannot be read the reply is a 503 that says so, with no report", async () => {
  const response = await runDryRunRequest(requestWith(`Bearer ${SECRET}`), {
    env: { CRM_CAPI_DRY_RUN_SECRET: SECRET },
    now: () => NOW,
    loadInput: async () => ({ ok: false, reason: "meta_unavailable" }),
  });
  assert.equal(response.status, 503);
  const body = (await response.json()) as { error: { message: string }; mode?: string };
  assert.match(body.error.message, /Meta/);
  assert.equal(body.mode, undefined);
});

test("handler: a good request gets the report, never cached, with no secret or token value in it", async () => {
  const env = {
    CRM_CAPI_DRY_RUN_SECRET: SECRET,
    META_CAPI_CRM_SEND_ENABLED: "true",
    META_CRM_DATASET_ID: "123456789012345",
    META_CRM_ACCESS_TOKEN: "crm-token-value-never-echoed",
  };
  const response = await runDryRunRequest(requestWith(`Bearer ${SECRET}`), {
    env,
    now: () => NOW,
    loadInput: async () => ({ ok: true, leads: [lead(KEYS.a)], outbox: [] }),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const text = await response.text();
  for (const secret of [SECRET, "crm-token-value-never-echoed", "123456789012345"]) {
    assert.equal(text.includes(secret), false);
  }
  const body = JSON.parse(text) as { mode: string; config: unknown; qualifyingLeads: { total: number } };
  assert.equal(body.mode, "dry_run");
  assert.deepEqual(body.config, { sendingEnabled: true, crmDatasetConfigured: true, crmTokenConfigured: true });
  assert.equal(body.qualifyingLeads.total, 1);
});

test("handler: an unexpected failure is a 500 with a generic message, never the error text", async () => {
  const response = await runDryRunRequest(requestWith(`Bearer ${SECRET}`), {
    env: { CRM_CAPI_DRY_RUN_SECRET: SECRET },
    now: () => NOW,
    loadInput: async () => {
      throw new Error("internal detail that must not leak");
    },
  });
  assert.equal(response.status, 500);
  assert.equal((await response.text()).includes("internal detail"), false);
});

test("config flags: only whether each value is set; sending needs the flag, the dataset and the token", () => {
  assert.deepEqual(configFlags({}), { sendingEnabled: false, crmDatasetConfigured: false, crmTokenConfigured: false });
  assert.deepEqual(configFlags({ META_CAPI_CRM_SEND_ENABLED: "true", META_CRM_DATASET_ID: "1", META_CRM_ACCESS_TOKEN: "t" }), {
    sendingEnabled: true,
    crmDatasetConfigured: true,
    crmTokenConfigured: true,
  });
  assert.equal(configFlags({ META_CAPI_CRM_SEND_ENABLED: "true", META_CRM_DATASET_ID: "1" }).sendingEnabled, false);
});

const read = (...parts: string[]) => readFileSync(path.join(process.cwd(), ...parts), "utf8");
const DRY_RUN_FILES = ["dry-run.ts", "dry-run-handler.ts", "dry-run-loader.ts"];

test("static guard: the dry run never imports or calls the send, flush or outbox-write code", () => {
  for (const file of DRY_RUN_FILES) {
    const source = read("src", "lib", "crm-capi", file);
    assert.doesNotMatch(source, /from\s+["']@\/lib\/crm-capi\/(send|service|pipeline|outbox)["']/, `${file} imports send code`);
    assert.doesNotMatch(
      source,
      /sendCrmEvent|flushCrmEvents|enqueueCrmEvents|claimDueCrmEvents|finishCrmEvent|recordCrmChange|graph\.facebook/,
      `${file} reaches the send path`
    );
  }
});

test("static guard: the dry run's SQL only reads", () => {
  const loader = read("src", "lib", "crm-capi", "dry-run-loader.ts");
  assert.doesNotMatch(loader, /\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|CREATE)\b/);
  assert.match(loader, /SELECT lead_key, event_type, status, event_time, sent_at, last_error\s+FROM crm_capi_events/);
});

test("static guard: the route answers GET only, is never cached, and uses its own secret", () => {
  const route = read("src", "app", "api", "admin", "crm-capi", "dry-run", "route.ts");
  assert.match(route, /export async function GET\(/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)\(/);
  assert.match(route, /export const dynamic = "force-dynamic"/);
  const handler = read("src", "lib", "crm-capi", "dry-run-handler.ts");
  assert.match(handler, /CRM_CAPI_DRY_RUN_SECRET/);
  assert.doesNotMatch(handler, /CRM_CAPI_FLUSH_SECRET/);
});
