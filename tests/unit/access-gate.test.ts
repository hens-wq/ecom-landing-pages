import assert from "node:assert/strict";
import { test } from "node:test";

import { NextRequest } from "next/server";

import { privateAreaOpen } from "@/lib/auth/mode";
import { isPublicRequest } from "@/lib/auth/access";
import { proxy } from "@/proxy";

// The access rule and the first gate, on synthetic requests only. No sign-in exists any more: the private area is open
// (Vercel Preview, or the one deployment that sets ECOM_ADMIN_ACCESS) or it answers 404.

const KEYS = ["VERCEL_ENV", "ECOM_ADMIN_ACCESS"] as const;

/** Calls the real proxy with the given environment, then restores the process environment. */
async function askProxy(path: string, method: string, env: Partial<Record<(typeof KEYS)[number], string>>) {
  const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  for (const key of KEYS) {
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  try {
    return proxy(new NextRequest(`https://example.test${path}`, { method }));
  } finally {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

function passes(response: { headers: Headers; status: number }): boolean {
  return response.headers.get("x-middleware-next") === "1";
}

test("the access rule: Preview is open, production is closed unless the exact admin value is set", () => {
  assert.equal(privateAreaOpen({ VERCEL_ENV: "preview" }), true);
  assert.equal(privateAreaOpen({ VERCEL_ENV: "production" }), false);
  assert.equal(privateAreaOpen({ VERCEL_ENV: "production", ECOM_ADMIN_ACCESS: "vercel-protected" }), true);
  assert.equal(privateAreaOpen({ VERCEL_ENV: "production", ECOM_ADMIN_ACCESS: "true" }), false, "only the exact value opens it");
  assert.equal(privateAreaOpen({ VERCEL_ENV: "production", ECOM_ADMIN_ACCESS: "" }), false);
  assert.equal(privateAreaOpen({}), false, "a run that is not on Vercel is closed too");
});

test("the public allowlist is exactly: the creative pages, Make's webhook, and the landing leads POST", () => {
  assert.equal(isPublicRequest("/creative/abc", "GET"), true);
  assert.equal(isPublicRequest("/api/webhooks/lead-status", "POST"), true);
  assert.equal(isPublicRequest("/api/landing-leads", "POST"), true);
  assert.equal(isPublicRequest("/api/landing-leads", "GET"), false, "reading leads is private");
  assert.equal(isPublicRequest("/api/leads", "GET"), false);
  assert.equal(isPublicRequest("/api/lead-status", "POST"), false, "changing lead statuses is private");
  assert.equal(isPublicRequest("/", "GET"), false);
  assert.equal(isPublicRequest("/login", "GET"), false, "there is no sign-in page any more");
});

test("closed deployment: private pages and APIs answer 404, the public routes continue", async () => {
  const closed = {};
  for (const path of ["/", "/leads", "/optimization", "/login", "/api/auth/session"]) {
    const response = await askProxy(path, "GET", closed);
    assert.equal(response.status, 404, `${path} is not there`);
    assert.equal(passes(response), false);
  }

  const api = await askProxy("/api/leads?since=2026-11-01&until=2026-11-01", "GET", closed);
  assert.equal(api.status, 404);
  assert.equal((await api.json()).error.code, "not_found", "a JSON refusal with no data in it");

  assert.equal(passes(await askProxy("/api/landing-leads", "GET", closed)), false, "lead reads stay closed");
  assert.equal(passes(await askProxy("/api/landing-leads", "POST", closed)), true, "the landing POST keeps its Bearer check");
  assert.equal(passes(await askProxy("/api/webhooks/lead-status", "POST", closed)), true, "Make's webhook keeps its Bearer check");
  assert.equal(passes(await askProxy("/creative/abc", "GET", closed)), true, "the creative page keeps working for reps");
});

test("open deployment (admin value or Preview): the private area passes through", async () => {
  assert.equal(passes(await askProxy("/api/leads", "GET", { VERCEL_ENV: "production", ECOM_ADMIN_ACCESS: "vercel-protected" })), true);
  assert.equal(passes(await askProxy("/", "GET", { VERCEL_ENV: "production", ECOM_ADMIN_ACCESS: "vercel-protected" })), true);
  assert.equal(passes(await askProxy("/api/leads", "GET", { VERCEL_ENV: "preview" })), true);
});
