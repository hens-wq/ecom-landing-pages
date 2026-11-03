require("node:fs").mkdirSync(process.env.OUTPUT_DIR || __dirname + "/output", { recursive: true });
// Extra Leads checks (scratch test, not part of the repo): the demo-mode guard and the mobile layout.
const { chromium } = require("playwright");
const path = require("node:path");
const { installLeadRoutes, BASE } = require("./fixtures.cjs");

const SCR = process.env.OUTPUT_DIR || __dirname + "/output";
const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 844 };
const json = (route, body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

(async () => {
  const browser = await chromium.launch();
  const results = [];
  const failures = [];
  const check = (name, ok, detail = "") => {
    results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
    if (!ok) failures.push(name);
  };

  // E: Meta not connected (demo leads) while the other sources answer. The page must say so and show no table.
  {
    const context = await browser.newContext({ viewport: DESKTOP, locale: "he-IL" });
    await context.route((url) => url.pathname === "/api/leads", (route) =>
      json(route, { source: "mock", leads: [{ id: "demo-1", createdTime: "2026-11-03T08:00:00.000Z", name: "דמו", phone: null, normalizedPhone: null, email: null, formId: "f", campaignId: "camp-ai", campaignName: "x", adSetId: "as-ai-cold", adSetName: "x", adId: "ad-ai-webinar", adName: "x", sourceType: "meta_standard_form" }] })
    );
    await context.route((url) => url.pathname === "/api/landing-leads", (route) => json(route, { leads: [] }));
    await context.route((url) => url.pathname === "/api/lead-status/batch", (route) => json(route, { records: [] }));
    await context.route((url) => url.pathname === "/api/lead-status/health", (route) => json(route, { connected: true }));
    await context.route((url) => url.pathname === "/api/lead-status/missing-payment", (route) => json(route, { leads: [], metaAvailable: true }));
    const page = await context.newPage();
    await page.goto(`${BASE}/leads`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.body.innerText.includes("מצב דמו") || document.querySelector("tr[data-lead-id]") !== null, null, { timeout: 20000 });
    const text = await page.evaluate(() => document.body.innerText);
    const rows = await page.$$eval("tr[data-lead-id]", (r) => r.length);
    check("Demo Meta leads: the Leads page says so", text.includes("מצב דמו"));
    check("Demo Meta leads: no table is shown", rows === 0, `rows=${rows}`);
    await context.close();
  }

  // F: mobile layout with the mocked data - 8 cards, no horizontal page scroll.
  {
    const context = await browser.newContext({ viewport: MOBILE, locale: "he-IL" });
    await installLeadRoutes(context);
    const page = await context.newPage();
    await page.goto(`${BASE}/leads`, { waitUntil: "networkidle" });
    await page.waitForSelector("tr[data-lead-id]", { timeout: 20000 });
    const cards = await page.$$eval('[data-slot="card-content"]', (els) => els.length);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check("Mobile Leads: KPI cards are present", cards >= 8, `cards=${cards}`);
    check("Mobile Leads: no page-level horizontal overflow", overflow <= 1, `overflow=${overflow}px`);
    await page.screenshot({ path: path.join(SCR, "leads-mobile.png"), fullPage: false });
    await context.close();
  }

  await browser.close();
  console.log(results.join("\n"));
  console.log(failures.length ? `\n${failures.length} FAILED` : "\nALL CHECKS PASSED");
  process.exit(failures.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
