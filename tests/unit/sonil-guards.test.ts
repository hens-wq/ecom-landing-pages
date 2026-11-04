import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

// The Sonil comparison reads files and our saved run. These static checks keep it that way: the pure modules make no
// network call, no AI call and no Meta call, and the server layer never rewrites a saved run.

const ROOT = process.cwd();
const PURE_DIR = join(ROOT, "src/lib/optimization/sonil");
const SERVER = join(ROOT, "src/lib/optimization/server/sonil.ts");
const NETWORK = /\bfetch\s*\(|XMLHttpRequest|\bhttps?:\/\/|\bWebSocket\b/;
const AI = /openai|anthropic|gemini|generativelanguage|@ai-sdk|langchain|mistral|cohere/i;
const META = /advertising\/meta|graph\.facebook|facebook\.com/i;

function pureSources(): Array<{ file: string; source: string }> {
  return readdirSync(PURE_DIR)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => ({ file: join(PURE_DIR, name), source: readFileSync(join(PURE_DIR, name), "utf8") }));
}

test("the Sonil modules make no network call, no AI call, and no call to Meta", () => {
  for (const { file, source } of pureSources()) {
    assert.doesNotMatch(source, NETWORK, `${file} makes a network call`);
    assert.doesNotMatch(source, AI, `${file} calls an AI provider`);
    assert.doesNotMatch(source, META, `${file} reaches Meta`);
  }
});

test("the pure Sonil modules never import server-only code or the database", () => {
  for (const { file, source } of pureSources()) {
    assert.doesNotMatch(source, /from "server-only"/, `${file} imports server-only`);
    assert.doesNotMatch(source, /lead-status\/db|@neondatabase|optimization\/server/, `${file} reaches the database layer`);
  }
});

test("the server layer stores Sonil imports and never rewrites a saved run", () => {
  const source = readFileSync(SERVER, "utf8");
  assert.doesNotMatch(source, NETWORK, "the server layer makes no outbound call");
  assert.doesNotMatch(source, META, "the server layer does not touch Meta");
  assert.match(source, /saveSonilImport/, "a save goes to the Sonil import store");
  assert.doesNotMatch(source, /\.saveRun\(/, "the saved run itself is never rewritten by a Sonil upload");
});
