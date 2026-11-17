// Browser and API checks for a live server that has NO demo flag and NO Meta settings: every Meta-backed figure must be an
// explicit error, never demo numbers, and the export must refuse to run. Run: LIVE_BASE_URL=http://localhost:3200 node tests/e2e/live-mode.cjs
const { chromium } = require("playwright");
const { DESKTOP, authedFetch, newAuthedContext } = require("./fixtures.cjs");

const LIVE = process.env.LIVE_BASE_URL || "http://localhost:3200";
const results = [];
const failures = [];
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
  if (!ok) failures.push(name);
}

const DAY = "2026-11-03";
const RANGE = `since=${DAY}&until=${DAY}`;

async function apiChecks() {
  const advertising = await authedFetch(`${LIVE}/api/advertising?${RANGE}`);
  const advertisingBody = await advertising.json();
  check("API advertising: an explicit not_configured error, HTTP 503", advertising.status === 503 && advertisingBody.error?.code === "not_configured", `status=${advertising.status}`);
  check("API advertising: no demo campaigns in the response", advertisingBody.campaigns === undefined);

  const statuses = await authedFetch(`${LIVE}/api/campaign-status`);
  check("API campaign-status: explicit error, not demo statuses", statuses.status === 503);

  const leads = await authedFetch(`${LIVE}/api/leads?${RANGE}`);
  check("API leads: explicit error, not demo leads", leads.status === 503);

  const exported = await authedFetch(`${LIVE}/api/leads/export-xlsx?${RANGE}`);
  const exportBody = await exported.json();
  check("API export: refuses without Meta, with the not_configured error", exported.status === 503 && exportBody.error?.code === "not_configured", `status=${exported.status}`);

  const facts = await (await authedFetch(`${LIVE}/api/lead-facts?${RANGE}`)).json();
  check("API lead-facts: Meta reported unavailable, no leads invented", facts.sources?.meta?.state === "unavailable" && facts.leads.length === 0);
}

async function uiChecks(browser) {
  const context = await newAuthedContext(browser, { viewport: DESKTOP, locale: "he-IL" }, LIVE);
  const page = await context.newPage();

  await page.goto(`${LIVE}/`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.body.innerText.includes("חיבור Meta Ads לא מוגדר"), null, { timeout: 20000 });
  let text = await page.evaluate(() => document.body.innerText);
  check("UI dashboard: the not-connected error is shown", text.includes("חיבור Meta Ads לא מוגדר"));
  check("UI dashboard: no demo rows or demo badge", !text.includes("Mock Data") && (await page.locator('tr[data-level="campaign"]').count()) === 0);

  await page.goto(`${LIVE}/leads`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.body.innerText.includes("לא ניתן היה לטעון נתוני לידים"), null, { timeout: 20000 });
  text = await page.evaluate(() => document.body.innerText);
  check("UI leads: the error is shown, not a table of demo leads", (await page.locator("tr[data-lead-id]").count()) === 0 && text.includes("לא ניתן היה לטעון נתוני לידים"));

  await page.goto(`${LIVE}/sales-matching`, { waitUntil: "networkidle" });
  text = await page.evaluate(() => document.body.innerText);
  check("UI sales matching: the not-connected notice replaces the demo table", text.includes("עדיין לא מחובר לנתוני מכירות אמיתיים") && !text.includes("נתוני דמו שממחישים"));

  await context.close();
}

(async () => {
  await apiChecks();
  const browser = await chromium.launch();
  try {
    await uiChecks(browser);
  } finally {
    await browser.close();
  }
  console.log(results.join("\n"));
  console.log(failures.length ? `\n${failures.length} FAILED` : "\nALL CHECKS PASSED");
  process.exit(failures.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
