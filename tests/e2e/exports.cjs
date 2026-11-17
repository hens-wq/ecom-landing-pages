// Browser check for the agent export (the 7-day CSV on the Leads page): a lead from the excluded campaign must never reach
// the file, while course leads do. Synthetic leads only. Run through tests/e2e/run-all.cjs, or: node tests/e2e/exports.cjs
const fs = require("node:fs");
const { chromium } = require("playwright");
const { BASE, DESKTOP, json, newAuthedContext } = require("./fixtures.cjs");

const RECRUITMENT_ID = "120248773681350125";
const COURSE_ID = "900000000000000001";
const results = [];
const failures = [];
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
  if (!ok) failures.push(name);
}

function lead(id, name, campaignId, campaignName, adSetId, adId) {
  return {
    id,
    createdTime: "2026-11-03T08:00:00.000Z",
    name,
    phone: null,
    normalizedPhone: null,
    email: null,
    formId: "form-export-test",
    campaignId,
    campaignName,
    adSetId,
    adSetName: "סדרה בדיקה",
    adId,
    adName: "מודעה בדיקה",
    sourceType: "meta_standard_form",
  };
}

const LEADS = [
  lead("export-course-1", "ליד קורס בדיקה 1", COURSE_ID, "קורס בדיקה", "as-course", "ad-course"),
  lead("export-course-2", "ליד קורס בדיקה 2", COURSE_ID, "קורס בדיקה", "as-course", "ad-course"),
  lead("export-recruit-1", "ליד גיוס בדיקה", RECRUITMENT_ID, "דרושים | אנשי מכירות", "as-recruit", "ad-recruit"),
];

async function installRoutes(context) {
  await context.route((url) => url.pathname === "/api/leads", (route) => json(route, { source: "meta", leads: LEADS }));
  await context.route((url) => url.pathname === "/api/landing-leads", (route) => json(route, { leads: [] }));
  await context.route((url) => url.pathname === "/api/lead-status/batch", (route) => json(route, { records: [] }));
  await context.route((url) => url.pathname === "/api/lead-status/health", (route) => json(route, { connected: true }));
  await context.route((url) => url.pathname === "/api/lead-status/missing-payment", (route) => json(route, { leads: [], metaAvailable: true }));
}

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await newAuthedContext(browser, { viewport: DESKTOP, locale: "he-IL", acceptDownloads: true });
    await installRoutes(context);
    const page = await context.newPage();
    await page.goto(`${BASE}/leads`, { waitUntil: "networkidle" });
    await page.waitForSelector("tr[data-lead-id]", { timeout: 20000 });

    const tableIds = await page.$$eval("tr[data-lead-id]", (rows) => rows.map((row) => row.getAttribute("data-lead-id")));
    check("the Leads table shows the course leads only", JSON.stringify([...tableIds].sort()) === JSON.stringify(["export-course-1", "export-course-2"]), JSON.stringify(tableIds));

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30000 }),
      page.getByRole("button", { name: /ייצוא לסוכן/ }).click(),
    ]);
    const csv = fs.readFileSync(await download.path(), "utf8");
    const dataLines = csv.split(/\r\n/).filter((line) => line.length > 0).length - 1;

    check("agent export: the course leads are in the file", csv.includes("export-course-1") && csv.includes("export-course-2") && csv.includes(COURSE_ID));
    check("agent export: the excluded campaign's lead and ID are not in the file", !csv.includes("export-recruit-1") && !csv.includes(RECRUITMENT_ID));
    check("agent export: exactly the two course leads", dataLines === 2, `data lines=${dataLines}`);

    await context.close();
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
