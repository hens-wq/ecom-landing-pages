// Browser checks for the selected-period spend and its warnings. Uses the demo server (ECOM_DEMO_DATA=1) for the date checks,
// and route-mocked Meta reconciliation states for the warnings. Run: node tests/e2e/period-spend.cjs
const { chromium } = require("playwright");
const { BASE, DESKTOP, installLeadRoutes, json, numberFrom, kpiValues, authedFetch, newAuthedContext } = require("./fixtures.cjs");

const results = [];
const failures = [];
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
  if (!ok) failures.push(name);
}

/** Today's calendar date in the reporting timezone, as the app computes it. */
function jerusalemToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
/** "2026-11-03" -> "03.11.2026". */
function dmy(iso) {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
}
function periodText(since, until) {
  return since === until ? dmy(since) : `${dmy(since)} – ${dmy(until)}`;
}

/** The selected-period spend card: its value, and the full text of the card (which includes its dates). */
async function periodCard(page) {
  return page.evaluate(() => {
    for (const content of document.querySelectorAll('[data-slot="card-content"]')) {
      const label = content.querySelector(".text-xs > span")?.textContent;
      if (label === "הוצאה בטווח הנבחר") {
        return { value: content.querySelector(".text-2xl")?.textContent ?? "", text: content.innerText };
      }
    }
    return null;
  });
}

async function pickPreset(page, label) {
  await page.getByRole("button", { name: /טווח תאריכים:/ }).first().click();
  await page.getByRole("menuitem", { name: label, exact: true }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
}

/** Records the date range of every advertising request the page makes. */
function recordAdvertisingRequests(page) {
  const requests = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/advertising") {
      requests.push({ since: url.searchParams.get("since"), until: url.searchParams.get("until") });
    }
  });
  return requests;
}

async function scenarioPresets(browser, today) {
  const context = await newAuthedContext(browser, { viewport: DESKTOP, locale: "he-IL" });
  await installLeadRoutes(context);
  const page = await context.newPage();
  const requests = recordAdvertisingRequests(page);
  await page.goto(`${BASE}/leads`, { waitUntil: "networkidle" });
  await page.waitForSelector("tr[data-lead-id]", { timeout: 20000 });

  const presets = [
    { label: "היום", since: today, until: today },
    { label: "אתמול", since: addDays(today, -1), until: addDays(today, -1) },
    { label: "היום ואתמול", since: addDays(today, -1), until: today },
    { label: "7 ימים אחרונים", since: addDays(today, -6), until: today },
    { label: "30 ימים אחרונים", since: addDays(today, -29), until: today },
    { label: "חודש נוכחי", since: `${today.slice(0, 8)}01`, until: today },
  ];

  const values = {};
  for (const preset of presets) {
    await pickPreset(page, preset.label);
    const last = requests[requests.length - 1];
    check(`"${preset.label}" requests exactly its own range`, last?.since === preset.since && last?.until === preset.until, JSON.stringify(last));
    const card = await periodCard(page);
    check(`"${preset.label}": the spend card shows the exact dates`, card?.text.includes(periodText(preset.since, preset.until)), periodText(preset.since, preset.until));
    values[preset.label] = card ? numberFrom(card.value) : null;
  }
  check("changing the range changes the selected-period spend", values["היום ואתמול"] !== values["היום"], `today=${values["היום"]} two-days=${values["היום ואתמול"]}`);

  // Custom range: exactly the From and To dates chosen.
  await page.getByRole("button", { name: /טווח תאריכים:/ }).first().click();
  const dateInputs = page.locator('input[type="date"]');
  await dateInputs.nth(0).fill("2026-10-01");
  await dateInputs.nth(1).fill("2026-10-10");
  await page.getByRole("button", { name: /החל טווח/ }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
  const custom = requests[requests.length - 1];
  check("custom range requests exactly From-To", custom?.since === "2026-10-01" && custom?.until === "2026-10-10", JSON.stringify(custom));
  const customCard = await periodCard(page);
  check("custom range: the spend card shows the chosen dates", customCard?.text.includes("01.10.2026 – 10.10.2026") === true);

  // Current month: from the first of the month through today.
  await pickPreset(page, "חודש נוכחי");
  const month = requests[requests.length - 1];
  check("current month runs from the 1st through today", month?.since === `${today.slice(0, 8)}01` && month?.until === today, JSON.stringify(month));

  check("the month-to-date card is gone", !(await page.evaluate(() => document.body.innerText.includes("הוצאה החודש"))));
  await context.close();
}

/** Route-mocks the advertising response with a given Meta check state, and returns the mocked spend total. */
async function installSpendCheck(context, status) {
  const today = jerusalemToday();
  const demo = await (await authedFetch(`${BASE}/api/advertising?since=${today}&until=${today}`)).json();
  const listed = demo.campaigns.reduce(
    (sum, campaign) => sum + campaign.adSets.reduce((adSetSum, adSet) => adSetSum + adSet.ads.reduce((adSum, ad) => adSum + ad.metrics.spend, 0), 0),
    0
  );
  const unlistedSpend = 30;
  const body = { ...demo, source: "meta", account: { id: "act_test", name: "חשבון בדיקה" }, unlisted: null, reconciliation: null };
  body.unlisted = { spend: unlistedSpend, impressions: 300, reach: 0, linkClicks: 0, leads: 0, sales: 0, revenue: 0 };
  if (status === "ok") {
    body.reconciliation = { status: "ok", accountSpend: listed + unlistedSpend, summedSpend: listed + unlistedSpend, excludedSpend: 0, difference: 0, message: "ההוצאה המסוכמת תואמת את סך ההוצאה בחשבון Meta לטווח." };
  } else if (status === "gap") {
    body.reconciliation = { status: "gap", accountSpend: listed + unlistedSpend + 50, summedSpend: listed + unlistedSpend, excludedSpend: 0, difference: 50, message: "פער של ₪50 בין ההוצאה המסוכמת לבין סך ההוצאה בחשבון Meta לטווח. הסכומים עשויים להיות חלקיים." };
  } else {
    body.reconciliation = { status: "unavailable", accountSpend: null, summedSpend: listed + unlistedSpend, excludedSpend: 0, difference: null, message: "לא ניתן לאמת את ההוצאה מול חשבון Meta כרגע: Meta לא זמין." };
  }
  await context.route((url) => url.pathname === "/api/advertising", (route) => json(route, body));
}

async function scenarioWarnings(browser, status, today) {
  const context = await newAuthedContext(browser, { viewport: DESKTOP, locale: "he-IL" });
  await installLeadRoutes(context);
  await installSpendCheck(context, status);
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForSelector('tr[data-level="campaign"]', { timeout: 20000 });
  const dashboardText = await page.evaluate(() => document.body.innerText);
  const unlistedRow = await page.locator('tr[data-row-id="unlisted-ads"]').count();

  check(`[${status}] dashboard: the unlisted spend row is shown`, unlistedRow === 1);
  check(`[${status}] dashboard: the unlisted spend is announced`, dashboardText.includes("נכללו") && dashboardText.includes("ממודעות שאינן ברשימה"));
  check(`[${status}] dashboard: the spend card is marked by its check`, status === "ok" ? dashboardText.includes("ההוצאה מאומתת מול חשבון Meta") : dashboardText.includes("לא מאומת מול חשבון Meta"));
  check(`[${status}] dashboard: no 'not yet excluded' warning, because the campaign ID is verified`, !dashboardText.includes("עדיין לא הוחרג מהמדדים"));
  if (status === "gap") check("[gap] dashboard: the gap is shown with its size", dashboardText.includes("פער של ₪50"));
  if (status === "unavailable") check("[unavailable] dashboard: the failure is shown, not a silent total", dashboardText.includes("לא ניתן לאמת את ההוצאה"));

  await page.goto(`${BASE}/leads`, { waitUntil: "networkidle" });
  await page.waitForSelector("tr[data-lead-id]", { timeout: 20000 });
  const leadsText = await page.evaluate(() => document.body.innerText);
  const card = await periodCard(page);
  check(`[${status}] leads: the selected-period spend card shows the check`, card !== null && (status === "ok" ? !card.text.includes("לא מאומת") : card.text.includes("לא מאומת מול חשבון Meta")));
  check(`[${status}] leads: the spend warnings appear on the Leads page, without the 'not yet excluded' notice`, !leadsText.includes("עדיין לא הוחרג מהמדדים") && (status === "ok" || leadsText.includes("נכללו")));
  check(`[${status}] leads: the card dates are today's`, card?.text.includes(dmy(today)) === true);
  await context.close();
}

(async () => {
  const today = jerusalemToday();
  const browser = await chromium.launch();
  try {
    await scenarioPresets(browser, today);
    await scenarioWarnings(browser, "ok", today);
    await scenarioWarnings(browser, "gap", today);
    await scenarioWarnings(browser, "unavailable", today);
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
