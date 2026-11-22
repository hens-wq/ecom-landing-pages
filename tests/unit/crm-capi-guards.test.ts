import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

// Static guards: these read the source, so they hold even where no database or Meta call can run.
const read = (...parts: string[]) => readFileSync(path.join(process.cwd(), ...parts), "utf8");

const PURE_MODULES = ["rules.ts", "policy.ts", "config.ts", "event.ts", "send.ts", "pipeline.ts"];

test("the pure CRM modules never import server-only code or the database driver", () => {
  for (const file of PURE_MODULES) {
    const source = read("src", "lib", "crm-capi", file);
    assert.doesNotMatch(source, /from\s+["']server-only["']/, `${file} imports server-only`);
    assert.doesNotMatch(source, /@neondatabase\/serverless|lead-status\/db/, `${file} touches the database`);
  }
});

test("CRM events are never website Lead events", () => {
  const config = read("src", "lib", "crm-capi", "config.ts");
  assert.match(config, /QUALIFIED_EVENT_NAME = "QualifiedLead"/);
  assert.match(config, /REGISTERED_EVENT_NAME = "RegisteredLead"/);
  const event = read("src", "lib", "crm-capi", "event.ts");
  assert.match(event, /action_source: "system_generated"/);
  assert.doesNotMatch(event, /action_source: "website"/);
  assert.doesNotMatch(event, /event_name: "Lead"/);
});

test("the CRM config reads its own token and dataset, and the website pixel keeps its own values", () => {
  const config = read("src", "lib", "crm-capi", "config.ts");
  assert.match(config, /env\.META_CRM_ACCESS_TOKEN/);
  assert.match(config, /env\.META_CRM_DATASET_ID/);
  assert.doesNotMatch(config, /env\.(META_CAPI_ACCESS_TOKEN|META_PIXEL_ID)/);
  assert.match(read("src", "lib", "meta-capi", "config.ts"), /META_CAPI_ACCESS_TOKEN/);
  assert.match(read("src", "lib", "meta-capi", "config.ts"), /META_PIXEL_ID/);
});

test("the outbox keeps one row per lead and event type, and claims rows without waiting on busy ones", () => {
  const outbox = read("src", "lib", "crm-capi", "outbox.ts");
  assert.match(outbox, /ON CONFLICT \(lead_key, event_type\) DO NOTHING/);
  assert.match(outbox, /FOR UPDATE SKIP LOCKED/);
});

test("the schema adds the rating column and the outbox table, and never drops or deletes", () => {
  const db = read("src", "lib", "lead-status", "db.ts");
  assert.match(db, /ADD COLUMN IF NOT EXISTS student_rating smallint/);
  assert.match(db, /CREATE TABLE IF NOT EXISTS crm_capi_events/);
  assert.doesNotMatch(db, /DROP |TRUNCATE|DELETE FROM/);
});

// The webhook's logic lives in lib/lead-status/webhook-handler.ts; the route only wires the real dependencies.
const webhookHandler = () => read("src", "lib", "lead-status", "webhook-handler.ts");

test("the webhook queues CRM events after a successful status update, replies, and never calls Meta itself", () => {
  const handler = webhookHandler();
  const route = read("src", "app", "api", "webhooks", "lead-status", "route.ts");
  const syncAt = handler.indexOf("const result = await syncCrmStatus(");
  const queueAt = handler.indexOf("await deps.recordCrm({");
  const replyAt = handler.indexOf("{ ok: true, applied: true");
  assert.ok(syncAt > 0 && queueAt > syncAt && replyAt > queueAt, "order must be: sync, then queue, then reply");
  assert.match(handler, /deps\.schedule\(\(\) => deps\.flush\(10\)\)/);
  assert.match(route, /schedule: \(task\) => after\(task\)/);
  assert.match(route, /flush: \(limit\) => flushCrmEventsSafely\(limit\)/);
  assert.doesNotMatch(handler + route, /sendCrmEvent|graph\.facebook/);
});

test("the webhook refuses a wrong rating but ignores an unreadable CRM timestamp", () => {
  const handler = webhookHandler();
  assert.match(handler, /parseStudentRatingUpdate\(body\)/);
  assert.match(handler, /Number\.isNaN\(parsed\.getTime\(\)\) \? undefined/);
});

test("the flush route is Bearer-protected and fails closed without its secret", () => {
  const route = read("src", "app", "api", "admin", "crm-capi", "flush", "route.ts");
  assert.match(route, /process\.env\.CRM_CAPI_FLUSH_SECRET/);
  assert.match(route, /status: 503/);
  assert.match(route, /status: 401/);
});

test("the pipeline queues nothing and sends nothing while the flag is off", () => {
  const pipeline = read("src", "lib", "crm-capi", "pipeline.ts");
  assert.match(pipeline, /if \(!deps\.sendEnabled\) return 0;/);
  assert.match(pipeline, /if \(!deps\.config\.sendEnabled\) return \{ \.\.\.summary, state: "disabled" \};/);
});

test("the webhook passes the lead's creation date, so Meta never receives an event stamped before the lead existed", () => {
  assert.match(webhookHandler(), /leadCreatedDate: index\.byId\.get\(result\.leadId\)\?\.createdDate/);
});
