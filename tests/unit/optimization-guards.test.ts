import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { test } from "node:test";

// Spec section 18, checks 8 and 9: no AI call anywhere in the optimization center, and no write to Meta.
// These are static checks on the source, so a future change that adds either one fails the suite.

const ROOT = process.cwd();
const OPTIMIZATION_DIRS = [
  "src/lib/optimization",
  "src/app/api/optimization",
  "src/components/optimization",
  "src/app/(dashboard)/optimization",
];
const META_DIRS = ["src/lib/advertising/meta"];
const AI_PROVIDER = /openai|anthropic|gemini|generativelanguage|ai-gateway|@ai-sdk|langchain|mistral|cohere/i;
const META_WRITE = /method\s*:\s*["'](POST|PUT|PATCH|DELETE)["']|\.(post|put|patch|delete)\(/i;

function sourceFiles(dir: string): string[] {
  const absolute = join(ROOT, dir);
  let entries: string[];
  try {
    entries = readdirSync(absolute);
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(absolute, entry);
    if (statSync(path).isDirectory()) files.push(...sourceFiles(relative(ROOT, path)));
    else if (/\.(ts|tsx)$/.test(entry)) files.push(path);
  }
  return files;
}

test("check 8: the optimization center calls no AI provider", () => {
  let scanned = 0;
  for (const dir of OPTIMIZATION_DIRS) {
    for (const file of sourceFiles(dir)) {
      scanned += 1;
      assert.equal(AI_PROVIDER.test(readFileSync(file, "utf8")), false, `${relative(ROOT, file)} names an AI provider`);
    }
  }
  assert.ok(scanned > 10, "the scan found the optimization sources");
});

test("check 8b: no AI provider package is installed", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  const names = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
  assert.deepEqual(
    names.filter((name) => AI_PROVIDER.test(name)),
    [],
    "no AI SDK in the project"
  );
});

// The UI and the API routes send POST and PATCH to this app's own routes (saving a run and an action status). Those are
// not Meta writes. What must hold: the optimization logic and the Meta client send no write request, and no optimization
// file calls the Graph API directly.
const WRITE_CHECKED_DIRS = ["src/lib/optimization", ...META_DIRS];
const GRAPH_HOST = /graph\.facebook\.com/i;

test("check 9: the optimization logic and the Meta client send no write request", () => {
  for (const dir of WRITE_CHECKED_DIRS) {
    for (const file of sourceFiles(dir)) {
      assert.equal(META_WRITE.test(readFileSync(file, "utf8")), false, `${relative(ROOT, file)} contains a write request`);
    }
  }
});

test("check 9b: no optimization file calls the Meta Graph API directly", () => {
  for (const dir of OPTIMIZATION_DIRS) {
    for (const file of sourceFiles(dir)) {
      assert.equal(GRAPH_HOST.test(readFileSync(file, "utf8")), false, `${relative(ROOT, file)} calls the Graph API directly`);
    }
  }
});

test("the rules stay pure: no module outside server/ imports server-only or the database driver", () => {
  const serverDir = `${sep}server${sep}`;
  for (const file of sourceFiles("src/lib/optimization")) {
    if (file.includes(serverDir)) continue;
    assert.equal(
      /from\s+["'](server-only|@neondatabase\/serverless)["']/.test(readFileSync(file, "utf8")),
      false,
      `${relative(ROOT, file)} must stay importable by the tests`
    );
  }
});
