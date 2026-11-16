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

test("the webhook queues CRM events after a successful status update, replies, and never calls Meta itself", () => {
  const route = read("src", "app", "api", "webhooks", "lead-status", "route.ts");
  const syncAt = route.indexOf("if (!result.ok)");
  const queueAt = route.indexOf("recordCrmChangeSafely({");
  const replyAt = route.indexOf("return NextResponse.json({ ok: true");
  assert.ok(syncAt > 0 && queueAt > syncAt && replyAt > queueAt, "order must be: sync, then queue, then reply");
  assert.match(route, /after\(\(\) => flushCrmEventsSafely\(/);
  assert.doesNotMatch(route, /sendCrmEvent|graph\.facebook/);
});

test("the webhook refuses a wrong rating but ignores an unreadable CRM timestamp", () => {
  const route = read("src", "app", "api", "webhooks", "lead-status", "route.ts");
  assert.match(route, /Number\.isInteger\(value\) && value >= 1 && value <= 5/);
  assert.match(route, /if \(Number\.isNaN\(parsed\.getTime\(\)\)\) return undefined|Number\.isNaN\(parsed\.getTime\(\)\) \? undefined/);
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
  const route = read("src", "app", "api", "webhooks", "lead-status", "route.ts");
  assert.match(route, /leadCreatedDate: index\.byId\.get\(result\.leadId\)\?\.createdDate/);
});
