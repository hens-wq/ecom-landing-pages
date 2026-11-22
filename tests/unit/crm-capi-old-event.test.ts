import assert from "node:assert/strict";
import { test } from "node:test";

import { recordCrmChange, type CrmChange, type NewCrmEvent } from "@/lib/crm-capi/pipeline";

const META_LEAD = "1202100000000111";
const NOW = new Date("2026-11-20T10:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function change(statusChangedAt: Date | undefined): CrmChange {
  return {
    leadKey: META_LEAD,
    previous: undefined,
    next: { mainStatus: "בתהליך", secondaryStatus: "בתהליך", studentRating: null },
    statusChangedAt,
    leadCreatedDate: "2026-11-01",
    now: NOW,
  };
}

function fakeOutbox() {
  const calls: NewCrmEvent[][] = [];
  return {
    calls,
    enqueue: async (events: NewCrmEvent[]) => {
      calls.push(events);
      return events.length;
    },
  };
}

test("an event whose change time is older than the Meta window is never queued", async () => {
  const outbox = fakeOutbox();
  const queued = await recordCrmChange(change(new Date(NOW.getTime() - 10 * DAY_MS)), { sendEnabled: true, outbox });
  assert.equal(queued, 0);
  assert.equal(outbox.calls.length, 0, "no row reaches the outbox, so no stale row can block a later event of the same type");
});

test("a recent change is queued once, with its own change time", async () => {
  const outbox = fakeOutbox();
  const when = new Date(NOW.getTime() - 2 * 60 * 60 * 1000);
  const queued = await recordCrmChange(change(when), { sendEnabled: true, outbox });
  assert.equal(queued, 1);
  assert.equal(outbox.calls[0][0].eventType, "qualified");
  assert.equal(outbox.calls[0][0].eventTime.getTime(), when.getTime());
});

test("with sending off nothing is queued, whatever the change time", async () => {
  const outbox = fakeOutbox();
  const queued = await recordCrmChange(change(NOW), { sendEnabled: false, outbox });
  assert.equal(queued, 0);
  assert.equal(outbox.calls.length, 0);
});
