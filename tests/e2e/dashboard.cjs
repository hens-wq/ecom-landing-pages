require("node:fs").mkdirSync(process.env.OUTPUT_DIR || __dirname + "/output", { recursive: true });
// Browser checks for the upgraded dashboard (scratch test, not part of the repo).
// The lead facts come from route mocks shaped like /api/lead-facts, keyed to the mock campaign tree.
const { chromium } = require("playwright");
const { newAuthedContext } = require("./fixtures.cjs");
const path = require("node:path");

const SCR = process.env.OUTPUT_DIR || __dirname + "/output";
const BASE = process.env.BASE_URL || "http://localhost:3100";
const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 844 };

const AD_TREE = [
  ["camp-ai", "as-ai-retargeting", ["ad-ai-coupon", "ad-ai-video", "ad-ai-vip-call"]],
  ["camp-ai", "as-ai-cold", ["ad-ai-carousel-explainer", "ad-ai-webinar"]],
  ["camp-cyber", "as-cyber-cold", ["ad-cyber-video-intro", "ad-cyber-carousel-tracks", "ad-cyber-static-discount"]],
  ["camp-fullstack", "as-fullstack-cold", ["ad-fullstack-day-in-life", "ad-fullstack-evening-track"]],
];

const STATUS_CYCLE = [
  { mainStatus: "נרשם", secondaryStatus: "תשלום מלא", fullPaymentAmount: 1000, partialPaymentAmount: null },
  { mainStatus: "חדש", secondaryStatus: "חדש", fullPaymentAmount: null, partialPaymentAmount: null },
  { mainStatus: "לא מעוניין", secondaryStatus: 'ל"מ - אין יכולת כלכלית', fullPaymentAmount: null, partialPaymentAmount: null },
  { mainStatus: "נרשם", secondaryStatus: "נרשם", fullPaymentAmount: null, partialPaymentAmount: null },
  { mainStatus: "בתהליך", secondaryStatus: "בתהליך", fullPaymentAmount: null, partialPaymentAmount: null },
];

function buildFacts({ landingDown = false, statusesPartial = false } = {}) {
  const leads = [];
  let n = 0;
  for (const [campaignId, adSetId, adIds] of AD_TREE) {
    for (const adId of adIds) {
      const count = 3 + (n % 3);
      for (let i = 0; i < count; i++) {
        const status = STATUS_CYCLE[(n + i) % STATUS_CYCLE.length];
        const known = !(statusesPartial && i === 0);
        leads.push({
          id: `L-${adId}-${i}`,
          sourceType: "meta_standard_form",
          leadDate: "2026-11-03",
          campaignId,
          adSetId,
          adId,
          statusKnown: known,
          // A lead whose status failed to load has no status fields at all, as the real lead facts do.
          ...(known ? status : { mainStatus: null, secondaryStatus: null, fullPaymentAmount: null, partialPaymentAmount: null }),
        });
      }
      n += 1;
    }
  }
  leads.push({ id: "L-direct", sourceType: "landing_page", leadDate: "2026-11-03", campaignId: "camp-ai", adSetId: null, adId: null, statusKnown: true, ...STATUS_CYCLE[4] });
  leads.push({ id: "L-unlisted", sourceType: "landing_page", leadDate: "2026-11-03", campaignId: "camp-gone", adSetId: null, adId: null, statusKnown: true, ...STATUS_CYCLE[1] });
  const unknownCount = leads.filter((lead) => !lead.statusKnown).length;
  return {
    since: "2026-11-03",
    until: "2026-11-03",
    leads,
    sources: {
      meta: { state: "ok", message: null },
      landing: landingDown ? { state: "unavailable", message: "לא ניתן לטעון לידים מדפי הנחיתה כרגע." } : { state: "ok", message: null },
      statuses: statusesPartial
        ? { state: "partial", unknownCount, message: "חלק מהסטטוסים לא נטען." }
        : { state: "ok", unknownCount: 0, message: null },
    },
  };
}

function expectedFigures(facts) {
  let sales = 0;
  let revenue = 0;
  for (const lead of facts.leads) {
    if (!lead.statusKnown) continue;
    if (lead.mainStatus === "נרשם") {
      sales += 1;
      if (lead.secondaryStatus === "תשלום מלא") revenue += lead.fullPaymentAmount ?? 0;
      if (lead.secondaryStatus === "תשלום חלקי") revenue += lead.partialPaymentAmount ?? 0;
    }
  }
  return { leads: facts.leads.length, sales, revenue };
}

const numberFrom = (text) => {
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

async function rowsOf(page, level) {
  return page.$$eval(`tr[data-level="${level}"]`, (rows) =>
    rows.map((row) => ({
      id: row.getAttribute("data-row-id"),
      name: row.querySelector("td span.truncate")?.textContent ?? "",
      cells: Array.from(row.querySelectorAll("td")).map((td) => td.textContent?.trim() ?? ""),
    }))
  );
}

async function allRowCount(page) {
  return page.$$eval("tr[data-level]", (rows) => rows.length);
}

(async () => {
  const browser = await chromium.launch();
  const results = [];
  const failures = [];
  const check = (name, ok, detail = "") => {
    results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
    if (!ok) failures.push(name);
  };

  // ---------- Scenario A: full data, filter switched to "הכול"
  {
    const facts = buildFacts();
    const expected = expectedFigures(facts);
    const context = await newAuthedContext(browser, { viewport: DESKTOP, locale: "he-IL" });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    await context.route("**/api/lead-facts**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(facts) })
    );

    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.waitForSelector('tr[data-level="campaign"]');
    const bodyText = await page.evaluate(() => document.body.innerText);
    check("A: demo mode shows 'טרם חובר' until a real connection", bodyText.includes("טרם חובר"));
    const defaultTop = (await rowsOf(page, "campaign")).length;
    check("A: default view keeps active campaigns and turned-off ones with results", defaultTop >= 1 && defaultTop <= 6, `top rows=${defaultTop}`);

    await page.getByRole("button", { name: /סטטוס קמפיין:/ }).click();
    await page.getByRole("menuitem", { name: /הכל/ }).click();
    await page.waitForTimeout(300);

    const topAll = await rowsOf(page, "campaign");
    check("A: 'all' view lists every campaign plus the unlisted-lead row", topAll.length === 6, `top rows=${topAll.length}`);
    check("A: unlisted leads form an unassigned campaign row", topAll.some((row) => row.id === "unassigned-campaign"));
    const unassignedRow = topAll.find((row) => row.id === "unassigned-campaign");
    check("A: unassigned row shows '—' for spend", unassignedRow?.cells[2] === "—", `cells=${JSON.stringify(unassignedRow?.cells.slice(0, 4))}`);

    const kpis = await kpiValues(page);
    check("A: KPI leads equal every lead in range", numberFrom(kpis["לידים"] ?? "") === expected.leads, `shown=${kpis["לידים"]} expected=${expected.leads}`);
    check("A: KPI sales equal registered leads", numberFrom(kpis["מכירות"] ?? "") === expected.sales, `shown=${kpis["מכירות"]} expected=${expected.sales}`);
    check("A: KPI revenue equals entered payments", numberFrom(kpis["הכנסות שהוזנו"] ?? "") === expected.revenue, `shown=${kpis["הכנסות שהוזנו"]} expected=${expected.revenue}`);
    const spendShown = numberFrom(kpis["הוצאה בטווח הנבחר"] ?? "") ?? 0;
    const cplShown = numberFrom(kpis["עלות לליד"] ?? "");
    if (spendShown > 0 && expected.leads > 0) {
      check("A: KPI CPL equals spend / leads", cplShown !== null && Math.abs(cplShown - spendShown / expected.leads) < 1, `cpl=${cplShown} expected~${(spendShown / expected.leads).toFixed(2)}`);
    }
    check("A: CPL carries a tier label", (await page.locator("text=/בתוך היעד|מעקב|אזהרה|חריגה חמורה/").count()) > 0);

    // Hierarchy: collapsed by default, expand and collapse all.
    check("A: expansion starts collapsed", (await allRowCount(page)) === 6, `rows=${await allRowCount(page)}`);
    await page.getByRole("button", { name: "הרחב הכול" }).click();
    const expandedCount = await allRowCount(page);
    check("A: expand all reveals ad sets and ads", expandedCount > 6, `rows=${expandedCount}`);
    check("A: direct campaign lead appears as a synthetic ad set", (await page.locator('tr[data-row-id="unassigned-adset:camp-ai"]').count()) === 1);
    await page.getByRole("button", { name: "סגור הכול" }).click();
    check("A: collapse all returns to campaign rows", (await allRowCount(page)) === 6, `rows=${await allRowCount(page)}`);

    // Sorting keeps the hierarchy and sinks unassigned rows.
    await page.locator("th", { hasText: "הוצאה (Spend)" }).locator("button").click();
    const sortedDesc = (await rowsOf(page, "campaign")).filter((row) => row.id !== "unassigned-campaign").map((row) => numberFrom(row.cells[2]) ?? -1);
    check("A: spend sort is descending on first click", (await page.locator("th", { hasText: "הוצאה (Spend)" }).getAttribute("aria-sort")) === "descending");
    check("A: spend values are descending", sortedDesc.every((value, index) => index === 0 || sortedDesc[index - 1] >= value), JSON.stringify(sortedDesc));
    const lastRow = (await rowsOf(page, "campaign")).at(-1);
    check("A: unassigned row stays last when sorted", lastRow?.id === "unassigned-campaign");
    await page.locator("th", { hasText: "הוצאה (Spend)" }).locator("button").click();
    check("A: second click flips to ascending", (await page.locator("th", { hasText: "הוצאה (Spend)" }).getAttribute("aria-sort")) === "ascending");
    await page.locator("th", { hasText: "שם (Name)" }).locator("button").click();
    const names = (await rowsOf(page, "campaign")).filter((row) => row.id !== "unassigned-campaign").map((row) => row.name);
    const sortedNames = [...names].sort((a, b) => a.localeCompare(b, "he"));
    check("A: name sort is Hebrew A-Z", JSON.stringify(names) === JSON.stringify(sortedNames), JSON.stringify(names));

    // Refresh keeps what the user opened.
    await page.getByRole("button", { name: "הרחב הכול" }).click();
    const beforeRefresh = await allRowCount(page);
    await page.getByRole("button", { name: /רענון נתונים/ }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    check("A: a refresh keeps the expanded rows open", (await allRowCount(page)) === beforeRefresh, `before=${beforeRefresh} after=${await allRowCount(page)}`);

    const overflowDesktop = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check("A: no page-level horizontal overflow on desktop", overflowDesktop <= 1, `overflow=${overflowDesktop}px`);
    await page.screenshot({ path: path.join(SCR, "dashboard-desktop-expanded.png"), fullPage: true });
    check("A: no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
    await context.close();
  }

  // ---------- Scenario B: landing source down
  {
    const facts = buildFacts({ landingDown: true });
    const context = await newAuthedContext(browser, { viewport: DESKTOP, locale: "he-IL" });
    const page = await context.newPage();
    await context.route("**/api/lead-facts**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(facts) })
    );
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.waitForSelector('tr[data-level="campaign"]');
    const bodyText = await page.evaluate(() => document.body.innerText);
    check("B: landing outage is announced", bodyText.includes("לידים מדפי הנחיתה לא נטענו"));
    const kpis = await kpiValues(page);
    check("B: leads KPI shows a dash, not zero", kpis["לידים"] === "—", `shown=${kpis["לידים"]}`);
    check("B: sales KPI shows a dash, not zero", kpis["מכירות"] === "—", `shown=${kpis["מכירות"]}`);
    check("B: spend still shows", (numberFrom(kpis["הוצאה בטווח הנבחר"] ?? "") ?? 0) > 0, `shown=${kpis["הוצאה בטווח הנבחר"]}`);
    await context.close();
  }

  // ---------- Scenario C: statuses partially loaded
  {
    const facts = buildFacts({ statusesPartial: true });
    const context = await newAuthedContext(browser, { viewport: DESKTOP, locale: "he-IL" });
    const page = await context.newPage();
    await context.route("**/api/lead-facts**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(facts) })
    );
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.waitForSelector('tr[data-level="campaign"]');
    const bodyText = await page.evaluate(() => document.body.innerText);
    check("C: partial statuses are announced with the count", bodyText.includes("סטטוס חסר ל-"));
    check("C: partial sales carry a 'חלקי' marker", (await page.getByText("חלקי", { exact: true }).count()) > 0);
    await context.close();
  }

  // ---------- Scenario D: mock server, no route mocks (real server path)
  {
    const context = await newAuthedContext(browser, { viewport: MOBILE, locale: "he-IL" });
    const page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.waitForFunction(
      () => document.querySelector('tr[data-level="campaign"]') !== null || document.body.innerText.includes("לא נמצאו קמפיינים"),
      null,
      { timeout: 15000 }
    );
    const bodyText = await page.evaluate(() => document.body.innerText);
    check("D: real server path renders the dashboard", (await rowsOf(page, "campaign")).length > 0 || bodyText.includes("לא נמצאו קמפיינים"));
    check("D: demo mode lead data is announced, not shown as real", bodyText.includes("מצב דמו") && bodyText.includes("לא נטענו"));
    const serverKpis = await kpiValues(page);
    check("D: demo mode leads KPI shows a dash, not demo numbers", serverKpis["לידים"] === "—", `shown=${serverKpis["לידים"]}`);
    check("D: demo mode spend still shows", (numberFrom(serverKpis["הוצאה בטווח הנבחר"] ?? "") ?? 0) > 0, `shown=${serverKpis["הוצאה בטווח הנבחר"]}`);
    const overflowMobile = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check("D: no page-level horizontal overflow on mobile", overflowMobile <= 1, `overflow=${overflowMobile}px`);
    await page.screenshot({ path: path.join(SCR, "dashboard-mobile-server.png"), fullPage: true });
    await context.close();
  }

  // ---------- Column order: a fresh layout starts with status, spend, leads, CPL, sales and cost per registration
  {
    const colCtx = await newAuthedContext(browser, { viewport: DESKTOP, locale: "he-IL" });
    const colPage = await colCtx.newPage();
    await colPage.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await colPage.waitForSelector('tr[data-level="campaign"]', { timeout: 20000 });
    const headers = await colPage.$$eval("thead th", (cells) => cells.map((cell) => cell.textContent.trim()));
    const expected = ["שם (Name)", "סטטוס (Status)", "הוצאה (Spend)", "לידים (Leads)", "עלות לליד (CPL)", "מכירות (Sales)", "עלות להרשמה (Cost per Registration)"];
    check("Default columns: status, spend, leads, CPL, sales, cost per registration come first", JSON.stringify(headers.slice(0, expected.length)) === JSON.stringify(expected), JSON.stringify(headers.slice(0, 7)));
    await colCtx.close();
  }

  // ---------- A layout the user already saved keeps its own order
  {
    const savedCtx = await newAuthedContext(browser, { viewport: DESKTOP, locale: "he-IL" });
    const savedOrder = ["spend", "impressions", "reach", "frequency", "linkClicks", "ctr", "cpc", "cpm", "leads", "cpl", "sales", "closeRate", "costPerSale", "revenue", "roas"];
    await savedCtx.addInitScript((order) => {
      window.localStorage.setItem("ecom:dashboard:columns:v1", JSON.stringify({ order, visibleKeys: order }));
    }, savedOrder);
    const savedPage = await savedCtx.newPage();
    await savedPage.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await savedPage.waitForSelector('tr[data-level="campaign"]', { timeout: 20000 });
    const headers = await savedPage.$$eval("thead th", (cells) => cells.map((cell) => cell.textContent.trim()));
    check("Saved layout: the user's own order is kept", headers[2] === "הוצאה (Spend)" && headers[3] === "חשיפות (Impressions)", JSON.stringify(headers.slice(0, 4)));
    await savedCtx.close();
  }

  await browser.close();
  console.log(results.join("\n"));
  console.log(failures.length ? `\n${failures.length} FAILED` : "\nALL CHECKS PASSED");
  process.exit(failures.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
