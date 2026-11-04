// The dashboard's session rules: signed tokens, constant-time password checks, the sign-in redirect and the public allowlist.
// Synthetic secrets only; the real values live in the deployment environment.
import assert from "node:assert/strict";
import { test } from "node:test";

import { isApiPath, isPublicRequest } from "@/lib/auth/access";
import { authConfigProblem, isSessionValid, issueSession, passwordMatches, safeNextPath } from "@/lib/auth/token";

const SECRET = "test-session-secret-0123456789abcdef0123";
const NOW = 1_800_000_000;

test("a freshly issued session is valid until it expires, and not after", () => {
  const { token, expiresAt } = issueSession(SECRET, NOW, 3600);
  assert.equal(expiresAt, NOW + 3600);
  assert.equal(isSessionValid(token, SECRET, NOW), true);
  assert.equal(isSessionValid(token, SECRET, NOW + 3599), true);
  assert.equal(isSessionValid(token, SECRET, NOW + 3600), false, "the expiry instant is already over");
});

test("a session cannot be extended by editing its expiry, and cannot be forged with another secret", () => {
  const { token } = issueSession(SECRET, NOW, 3600);
  const [version, , signature] = token.split(".");
  const extended = `${version}.${NOW + 999_999}.${signature}`;
  assert.equal(isSessionValid(extended, SECRET, NOW), false, "the signature covers the expiry");
  assert.equal(isSessionValid(issueSession("another-secret-that-is-also-long-enough-0000", NOW).token, SECRET, NOW), false);
});

test("garbage, a missing cookie and a wrong version are never valid", () => {
  for (const value of [undefined, null, "", "v1", "v1.abc.def", "v2.1800003600.00", "not-a-token", "v1.1800003600.zz.extra"]) {
    assert.equal(isSessionValid(value, SECRET, NOW), false, `refused: ${String(value)}`);
  }
});

test("passwords are compared exactly, including when the lengths differ", () => {
  assert.equal(passwordMatches("correct horse battery", "correct horse battery"), true);
  assert.equal(passwordMatches("correct horse battery!", "correct horse battery"), false);
  assert.equal(passwordMatches("", "correct horse battery"), false);
  assert.equal(passwordMatches("CORRECT horse battery", "correct horse battery"), false, "case matters");
});

test("sign-in needs a password of at least 12 characters and a secret of at least 32, and says nothing more to visitors", () => {
  assert.match(authConfigProblem(undefined, SECRET) ?? "", /DASHBOARD_PASSWORD/);
  assert.match(authConfigProblem("short", SECRET) ?? "", /shorter than 12/);
  assert.match(authConfigProblem("a-long-enough-password", undefined) ?? "", /SESSION_SECRET/);
  assert.match(authConfigProblem("a-long-enough-password", "too-short") ?? "", /shorter than 32/);
  assert.equal(authConfigProblem("a-long-enough-password", SECRET), null);
});

test("the sign-in redirect only ever goes to a path on this site", () => {
  assert.equal(safeNextPath("/leads"), "/leads");
  assert.equal(safeNextPath("/optimization?run=1"), "/optimization?run=1");
  assert.equal(safeNextPath("https://evil.example/x"), "/");
  assert.equal(safeNextPath("//evil.example/x"), "/");
  assert.equal(safeNextPath("/\\evil.example"), "/");
  assert.equal(safeNextPath("/\nSet-Cookie: x"), "/");
  assert.equal(safeNextPath("/login"), "/", "never back to the sign-in page");
  assert.equal(safeNextPath("/api/leads"), "/", "never into an API response");
  assert.equal(safeNextPath(undefined), "/");
});

test("only the sign-in page, its own endpoints, the creative page and the two Bearer-protected machine routes are public", () => {
  assert.equal(isPublicRequest("/login", "GET"), true);
  assert.equal(isPublicRequest("/api/auth/login", "POST"), true);
  assert.equal(isPublicRequest("/api/auth/session", "GET"), true);
  assert.equal(isPublicRequest("/creative/ad-123", "GET"), true);
  assert.equal(isPublicRequest("/api/webhooks/lead-status", "POST"), true, "Make keeps its Bearer check");
  assert.equal(isPublicRequest("/api/landing-leads", "POST"), true, "the landing pages keep their Bearer check");

  // Reading leads from the landing-page store is a private read, not public.
  assert.equal(isPublicRequest("/api/landing-leads", "GET"), false);
  for (const path of ["/", "/leads", "/optimization", "/integrations", "/sales-matching", "/api/leads", "/api/advertising"]) {
    assert.equal(isPublicRequest(path, "GET"), false, `${path} needs a session`);
  }
  assert.equal(isPublicRequest("/api/optimization/runs", "POST"), false, "starting an analysis needs a session");
  assert.equal(isPublicRequest("/api/lead-status", "POST"), false, "writing a status needs a session");
});

test("API paths are recognised, so their refusals are JSON rather than a redirect", () => {
  assert.equal(isApiPath("/api/leads"), true);
  assert.equal(isApiPath("/api"), true);
  assert.equal(isApiPath("/leads"), false);
  assert.equal(isApiPath("/apiary"), false);
});
