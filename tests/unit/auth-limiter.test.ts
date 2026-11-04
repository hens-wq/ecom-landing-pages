// The sign-in brake: failed attempts are counted per client, the count resets after the window, and a success does not add to it.
import assert from "node:assert/strict";
import { test } from "node:test";

import { clientKey, recordFailedSignIn, SIGN_IN_MAX_FAILURES, SIGN_IN_WINDOW_MS, signInBlocked } from "@/lib/auth/limiter";

test("sign-in is blocked after the allowed number of failures, and only for that client", () => {
  const now = 1_800_000_000_000;
  const client = `client-${Math.random()}`;
  for (let attempt = 1; attempt < SIGN_IN_MAX_FAILURES; attempt += 1) {
    recordFailedSignIn(client, now + attempt);
  }
  assert.equal(signInBlocked(client, now + 100), false, "one short of the limit is still allowed");
  recordFailedSignIn(client, now + 100);
  assert.equal(signInBlocked(client, now + 200), true, "at the limit, the client is blocked");
  assert.equal(signInBlocked(`other-${client}`, now + 200), false, "other clients are not affected");
});

test("the block lifts once the failures are older than the window", () => {
  const now = 1_800_000_000_000;
  const client = `window-${Math.random()}`;
  for (let attempt = 0; attempt < SIGN_IN_MAX_FAILURES; attempt += 1) recordFailedSignIn(client, now);
  assert.equal(signInBlocked(client, now + SIGN_IN_WINDOW_MS - 1), true);
  assert.equal(signInBlocked(client, now + SIGN_IN_WINDOW_MS), false);
});

test("the client key is the first forwarded address, or one shared bucket when there is none", () => {
  const withForward = new Request("https://x.test/api/auth/login", { headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" } });
  assert.equal(clientKey(withForward), "203.0.113.7");
  assert.equal(clientKey(new Request("https://x.test/api/auth/login")), "unknown");
});
