import assert from "node:assert/strict";
import { test } from "node:test";

import { appSignInRequired } from "@/lib/auth/mode";

test("only a Vercel Preview opens without the app sign-in", () => {
  assert.equal(appSignInRequired("preview"), false);
  assert.equal(appSignInRequired("production"), true);
  assert.equal(appSignInRequired("development"), true);
  assert.equal(appSignInRequired(undefined), true, "a local run keeps the sign-in");
  assert.equal(appSignInRequired("Preview"), true, "an unexpected spelling keeps the sign-in");
  assert.equal(appSignInRequired(""), true, "an empty value keeps the sign-in");
});
