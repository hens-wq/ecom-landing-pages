require("node:fs").mkdirSync(process.env.OUTPUT_DIR || __dirname + "/output", { recursive: true });
// Browser checks for the Leads page and its agreement with the dashboard (scratch test, not part of the repo).
// The lead lists, statuses and lead facts are route mocks built from one fixture. Spend and campaigns come from the real server in demo mode.
const { chromium } = require("playwright");
const path = require("node:path");

const SCR = process.env.OUTPUT_DIR || __dirname + "/output";
const BASE = process.env.BASE_URL || "http://localhost:3100";
const DAY = "2026-11-03";
const DESKTOP = { width: 1280, height: 900 };

const ADS = [
  { campaignId: "camp-ai", campaignName: "קמפיין AI - בינה מלאכותית", adSetId: "as-ai-retargeting", adSetName: "רימרקטינג - מבקרים באתר (30 יום)", adId: "ad-ai-coupon", adName: "מודעה - קופון הנחה 500 ש״ח" },
  { campaignId: "camp-cyber", campaignName: "קמפיין Cyber - הגנת סייבר", adSetId: "as-cyber-cold", adSetName: "קהל קר - עניין באבטחת מידע", adId: "ad-cyber-video-intro", adName: "מודעה - וידאו: איך נכנסים לעולם הסייבר" },
  { campaignId: "camp-fullstack", campaignName: "קמפיין Full Stack - פיתוח תוכנה", adSetId: "as-fullstack-cold", adSetName: "קהל קר - מעוניינים בפיתוח תוכנה", adId: "ad-fullstack-day-in-life", adName: "מודעה - וידאו: יום בחיים של מפתח/ת" },
];
const UNKNOWN_AD = { campaignId: "camp-gone", campaignName: "קמפיין לא ידוע", adSetId: "as-gone", adSetName: "סדרה לא ידועה", adId: "ad-gone", adName: "מודעה לא ידועה" };

// main/secondary are real Ecom labels. `hasRecord: false` means no saved status, so the page uses the default "חדש".
// Expected quality: green = 1,2,3,4,5,12 (6); red = 6,7,11 (3); pending = 8,9 (2); unmapped = 10 (1).
// Expected sales = 1,2,3,12 (4); revenue = 1000 + 500 + 0 + 2000 = 3500.
const FIXTURE = [
  { main: "נרשם", secondary: "תשלום מלא", full: 1000, partial: null, source: "meta_standard_form" },
  { main: "נרשם", secondary: "תשלום חלקי", full: null, partial: 500, source: "meta_rich_form" },
  { main: "נרשם", secondary: "נרשם", full: null, partial: null, source: "meta_standard_form" },
  { main: "בתהליך", secondary: "בתהליך", full: null, partial: null, source: "meta_standard_form" },
  { main: "לא מעוניין", secondary: 'ל"מ - מחיר יקר', full: null, partial: null, source: "meta_rich_form" },
  { main: "לא מעוניין", secondary: 'ל"מ - לא מעוניין ללמוד הייטק', full: null, partial: null, source: "meta_standard_form" },
  { main: "ליד שגוי", secondary: "ליד שגוי - מס' טלפון שגוי", full: null, partial: null, source: "meta_standard_form" },
  { main: "DATA", secondary: "דאטה", full: null, partial: null, source: "meta_rich_form" },
  { main: "חדש", secondary: "חדש", full: null, partial: null, source: "meta_standard_form", hasRecord: false },
  { main: "בתהליך", secondary: "סטטוס ישן שלא קיים", full: null, partial: null, source: "meta_standard_form" },
  { main: "לא מעוניין", secondary: 'ל"מ - אין יכולת כלכלית', full: null, partial: null, source: "meta_rich_form" },
  { main: "נרשם", secondary: "תשלום מלא", full: 2000, partial: null, source: "meta_standard_form" },
];

const EXPECTED = { leads: 12, sales: 4, revenue: 3500, green: 6, red: 3, pending: 2, unmapped: 1, irrelevant: 2 };

function adFor(index) {
  return index === 9 ? UNKNOWN_AD : ADS[index % ADS.length];
}
function metaLead(index, fixture) {
  return {
    id: `lead-${index + 1}`,
    createdTime: `${DAY}T08:00:00.000Z`,
    name: `ליד בדיקה ${index + 1}`,
    phone: null,
    normalizedPhone: null,
    email: null,
    formId: "form-test",
    ...adFor(index),
    sourceType: fixture.source,
  };
}
function statusRecord(index, fixture) {
  return {
    leadId: `lead-${index + 1}`,
    normalizedPhone: null,
    mainStatus: fixture.main,
    secondaryStatus: fixture.secondary,
    fullPaymentAmount: fixture.full,
    partialPaymentAmount: fixture.partial,
    studentRating: null,
    updatedAt: `${DAY}T08:00:00.000Z`,
  };
}
function leadFact(index, fixture) {
  return {
    id: `lead-${index + 1}`,
    sourceType: fixture.source,
    leadDate: DAY,
    campaignId: adFor(index).campaignId,
    adSetId: adFor(index).adSetId,
    adId: adFor(index).adId,
    statusKnown: true,
    mainStatus: fixture.main,
    secondaryStatus: fixture.secondary,
    fullPaymentAmount: fixture.full,
    partialPaymentAmount: fixture.partial,
  };
}

const json = (route, body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

async function installLeadRoutes(context) {
  await context.route((url) => url.pathname === "/api/leads", (route) =>
    json(route, { source: "meta", leads: FIXTURE.map((f, i) => metaLead(i, f)) })
  );
  await context.route((url) => url.pathname === "/api/landing-leads", (route) => json(route, { leads: [] }));
  await context.route((url) => url.pathname === "/api/lead-status/batch", (route) =>
    json(route, { records: FIXTURE.flatMap((f, i) => (f.hasRecord === false ? [] : [statusRecord(i, f)])) })
  );
  await context.route((url) => url.pathname === "/api/lead-status/health", (route) => json(route, { connected: true }));
  await context.route((url) => url.pathname === "/api/lead-status/missing-payment", (route) =>
    json(route, { leads: [], metaAvailable: true })
  );
}

async function installDashboardRoutes(context) {
  await context.route((url) => url.pathname === "/api/lead-facts", (route) =>
    json(route, {
      since: DAY,
      until: DAY,
      leads: FIXTURE.map((f, i) => leadFact(i, f)),
      sources: {
        meta: { state: "ok", message: null },
        landing: { state: "ok", message: null },
        statuses: { state: "ok", unknownCount: 0, message: null },
      },
    })
  );
}

const numberFrom = (text) => {
  if (text === undefined) return null;
  const cleaned = text.replace(/[^\d.-]/g, "");
  return cleaned === "" ? null : Number(cleaned);
};

async function kpiValues(page) {
  return page.evaluate(() => {
    const out = {};
    for (const content of document.querySelectorAll('[data-slot="card-content"]')) {
      const label = content.querySelector(".text-xs > span")?.textContent;
      const value = content.querySelector(".text-2xl")?.textContent;
      if (label && value !== undefined) out[label] = value;
    }
    return out;
  });
}

async function fetchDemoSpend() {
  const res = await fetch(`${BASE}/api/advertising?since=${DAY}&until=${DAY}`);
  const body = await res.json();
  let total = 0;
  for (const campaign of body.campaigns) for (const adSet of campaign.adSets) for (const ad of adSet.ads) total += ad.metrics.spend;
  return total;
}

(async () => {
  const browser = await chromium.launch();
  const results = [];
  const failures = [];
  const check = (name, ok, detail = "") => {
    results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
    if (!ok) failures.push(name);
  };
  const near = (actual, expected, tolerance) => actual !== null && Math.abs(actual - expected) <= tolerance;

  const spend = await fetchDemoSpend();
  check("expected spend is positive (demo data)", spend > 0, `spend=${spend.toFixed(2)}`);

  // ---------- Leads page, mocked lead data
  const leadsCtx = await browser.newContext({ viewport: DESKTOP, locale: "he-IL" });
  const page = await leadsCtx.newPage();
  const leadsConsoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") leadsConsoleErrors.push(msg.text());
  });
  await installLeadRoutes(leadsCtx);
  await page.goto(`${BASE}/leads`, { waitUntil: "networkidle" });
  await page.waitForSelector("tr[data-lead-id]", { timeout: 20000 });

  const bodyLeads = await page.evaluate(() => document.body.innerText);
  check("Leads: both pickers open on 'היום' by default", (await page.getByRole("button", { name: /טווח תאריכים: היום$/ }).count()) === 2);
  check("Leads: table shows every fixture lead", (await page.$$eval("tr[data-lead-id]", (rows) => rows.length)) === EXPECTED.leads);

  const kpis = await kpiValues(page);
  const requiredLabels = ["מכירות", "אחוז סגירה", "עלות להרשמה", "הכנסות שהוזנו", "הוצאה בטווח הנבחר", "אחוז לידים לא רלוונטיים", "עלות לליד", "עלות לליד מוכשר"];
  const missingLabels = requiredLabels.filter((label) => !(label in kpis));
  check("Leads: all eight KPI cards are present", missingLabels.length === 0, missingLabels.length ? `missing=${missingLabels.join(",")}` : "");

  const sales = numberFrom(kpis["מכירות"]);
  const revenue = numberFrom(kpis["הכנסות שהוזנו"]);
  const closeRate = numberFrom(kpis["אחוז סגירה"]);
  const irrelevant = numberFrom(kpis["אחוז לידים לא רלוונטיים"]);
  const costPerRegistration = numberFrom(kpis["עלות להרשמה"]);
  const cpl = numberFrom(kpis["עלות לליד"]);
  const qualifiedCpl = numberFrom(kpis["עלות לליד מוכשר"]);

  check("Leads: sales = leads with main status נרשם", sales === EXPECTED.sales, `shown=${kpis["מכירות"]}`);
  check("Leads: recorded revenue = entered payments only", revenue === EXPECTED.revenue, `shown=${kpis["הכנסות שהוזנו"]}`);
  check("Leads: close rate = sales / leads", near(closeRate, (EXPECTED.sales / EXPECTED.leads) * 100, 0.06), `shown=${kpis["אחוז סגירה"]}`);
  check("Leads: irrelevant rate uses the operational rule", near(irrelevant, (EXPECTED.irrelevant / EXPECTED.leads) * 100, 0.06), `shown=${kpis["אחוז לידים לא רלוונטיים"]}`);
  check("Leads: cost per registration = spend / sales", near(costPerRegistration, spend / EXPECTED.sales, 1), `shown=${kpis["עלות להרשמה"]} expected~${(spend / EXPECTED.sales).toFixed(0)}`);
  check("Leads: CPL = spend / leads", near(cpl, spend / EXPECTED.leads, 1), `shown=${kpis["עלות לליד"]} expected~${(spend / EXPECTED.leads).toFixed(0)}`);
  check("Leads: Qualified CPL = spend / green leads", near(qualifiedCpl, spend / EXPECTED.green, 1), `shown=${kpis["עלות לליד מוכשר"]} expected~${(spend / EXPECTED.green).toFixed(0)}`);
  check("Leads: CPL carries a tier label", (await page.locator("text=/בתוך היעד|מעקב|אזהרה|חריגה חמורה/").count()) > 0);
  check(
    "Leads: quality counts shown (green / red / pending)",
    bodyLeads.includes(`ירוקים ${EXPECTED.green}`) && bodyLeads.includes(`אדומים ${EXPECTED.red}`) && bodyLeads.includes(`ממתינים: ${EXPECTED.pending}`)
  );
  check("Leads: coverage warning for the unmapped status", bodyLeads.includes(`כיסוי חלקי: ${EXPECTED.unmapped} לידים`));
  check("Leads: the period-spend card shows a date", /\d{2}\.\d{2}\.\d{4}/.test(bodyLeads) && bodyLeads.includes("הוצאה בטווח הנבחר"));

  const leadsValues = { leads: EXPECTED.leads, sales, revenue, closeRate, cpl, costPerRegistration };

  // ---------- Dashboard with the same fixture: the same formulas must give the same numbers
  const dashCtx = await browser.newContext({ viewport: DESKTOP, locale: "he-IL" });
  const dash = await dashCtx.newPage();
  await installDashboardRoutes(dashCtx);
  await dash.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await dash.waitForSelector('tr[data-level="campaign"]', { timeout: 20000 });
  await dash.getByRole("button", { name: /סטטוס קמפיין:/ }).click();
  await dash.getByRole("menuitem", { name: /הכל/ }).click();
  await dash.waitForTimeout(300);
  const dkpis = await kpiValues(dash);
  const dashValues = {
    leads: numberFrom(dkpis["לידים"]),
    sales: numberFrom(dkpis["מכירות"]),
    revenue: numberFrom(dkpis["הכנסות שהוזנו"]),
    closeRate: numberFrom(dkpis["אחוז סגירה"]),
    cpl: numberFrom(dkpis["עלות לליד"]),
    costPerRegistration: numberFrom(dkpis["עלות להרשמה"]),
  };
  const compare = (key, tolerance) => {
    const a = leadsValues[key];
    const b = dashValues[key];
    check(`Leads = dashboard: ${key}`, a !== null && b !== null && Math.abs(a - b) <= tolerance, `leads=${a} dashboard=${b}`);
  };
  compare("leads", 0);
  compare("sales", 0);
  compare("revenue", 0);
  compare("closeRate", 0.06);
  compare("cpl", 1);
  compare("costPerRegistration", 1);
  await dash.screenshot({ path: path.join(SCR, "dashboard-all-view.png"), fullPage: false });
  await dashCtx.close();

  // ---------- Date presets: order, and both pickers stay in sync
  await page.getByRole("button", { name: /טווח תאריכים: היום$/ }).first().click();
  const presetOrder = await page.$$eval('[role="menuitem"]', (items) => items.map((item) => item.textContent.trim()));
  const expectedOrder = ["היום", "אתמול", "היום ואתמול", "7 ימים אחרונים", "30 ימים אחרונים", "חודש נוכחי"];
  check("Presets: order היום, אתמול, היום ואתמול, 7, 30 ימים, חודש נוכחי", JSON.stringify(presetOrder.slice(0, 6)) === JSON.stringify(expectedOrder), JSON.stringify(presetOrder.slice(0, 6)));
  await page.getByRole("menuitem", { name: "היום ואתמול" }).click();
  await page.waitForTimeout(400);
  check("Presets: picking 'היום ואתמול' updates both pickers", (await page.getByRole("button", { name: /טווח תאריכים: היום ואתמול/ }).count()) === 2);

  // ---------- Lead-source filter: spend cannot be split by source, so cost figures show "—" with the reason
  await page.getByRole("button", { name: /מקור ליד:/ }).click();
  await page.getByRole("menuitem", { name: "טופס Meta רגיל" }).click();
  await page.waitForTimeout(400);
  const filteredKpis = await kpiValues(page);
  const filteredBody = await page.evaluate(() => document.body.innerText);
  check("Source filter: CPL shows '—', not a number", filteredKpis["עלות לליד"] === "—", `shown=${filteredKpis["עלות לליד"]}`);
  check("Source filter: cost figures explain why", filteredBody.includes('בחרו "הכול" במקור ליד'));
  await page.getByRole("button", { name: /מקור ליד:/ }).click();
  await page.getByRole("menuitem", { name: "הכל (All)" }).click();
  await page.waitForTimeout(400);
  const restoredKpis = await kpiValues(page);
  check("Source filter: 'הכול' restores the CPL", numberFrom(restoredKpis["עלות לליד"]) !== null);

  await page.screenshot({ path: path.join(SCR, "leads-desktop.png"), fullPage: true });
  check("Leads: no console errors (mocked data)", leadsConsoleErrors.length === 0, leadsConsoleErrors.slice(0, 3).join(" | "));
  await leadsCtx.close();

  // ---------- Demo mode, real server, no route mocks: nothing should show as real numbers
  const demoCtx = await browser.newContext({ viewport: DESKTOP, locale: "he-IL" });
  const demo = await demoCtx.newPage();
  await demo.goto(`${BASE}/leads`, { waitUntil: "networkidle" });
  await demo.waitForFunction(() => document.body.innerText.includes("לא ניתן היה לטעון נתוני לידים") || document.querySelector("tr[data-lead-id]") !== null, null, { timeout: 20000 });
  const demoBody = await demo.evaluate(() => document.body.innerText);
  check("Demo mode (no DB): Leads shows an explicit error, not zeros", demoBody.includes("לא ניתן היה לטעון נתוני לידים"));
  await demoCtx.close();

  await browser.close();
  console.log(results.join("\n"));
  console.log(failures.length ? `\n${failures.length} FAILED` : "\nALL CHECKS PASSED");
  process.exit(failures.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
