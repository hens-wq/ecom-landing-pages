// Browser checks for the optimization centre, on demo data only. Covers: the sidebar item, the four tabs (English name first,
// Hebrew underneath), the run header order, that no analysis starts on load, a tab switch or a reload (only the button starts
// one), the range state (a report is never shown for another range), the Campaign Status scope, the synced horizontal
// scrollbars, the Sonil comparison (upload, mapping by ID, check, save), saved action statuses, and the phone layout.
// Demo data is synthetic; nothing here touches Meta or the database.
const { chromium } = require("playwright");
const { BASE, DESKTOP, authedFetch, newAuthedContext } = require("./fixtures.cjs");

const MOBILE = { width: 390, height: 844 };
/** The closed deployment (no ECOM_ADMIN_ACCESS): the private routes do not exist there. See tests/README.md. */
const PUBLIC_BASE = process.env.PUBLIC_BASE_URL || "http://localhost:3300";
/** English name first, the Hebrew translation small underneath (components/optimization/shared.tsx, Bilingual). */
const TAB_HEADINGS = [
  ["Exposure & Traffic", "חשיפה ותנועה"],
  ["Leads & Sales", "לידים ומכירות"],
  ["Sunil Optimization", "אופטימיזציית סוניל"],
  ["Optimization Summary", "סיכום אופטימיזציה"],
];
const TAB_NAMES = TAB_HEADINGS.map(([english]) => new RegExp(english.replace(/&/g, "\\&")));
const PAUSED_CAMPAIGN = "קמפיין הייטק כללי";
const results = [];
const failures = [];
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
  if (!ok) failures.push(name);
}

/** A day (YYYY-MM-DD) in the reporting timezone, offset from today. */
function reportingDay(offsetDays = 0) {
  const day = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(day);
}
function dmy(iso) {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await newAuthedContext(browser, { viewport: DESKTOP, locale: "he-IL" });
    const page = await context.newPage();
    const consoleErrors = [];
    let runPosts = 0;
    let expectedPosts = 0;
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("request", (request) => {
      // Only the analysis endpoint counts. A Sonil upload posts to its own path under the run and starts no analysis.
      if (request.method() === "POST" && new URL(request.url()).pathname === "/api/optimization/runs") runPosts += 1;
    });

    // Navigation: the item is on the right-hand sidebar, next to the other dashboard pages.
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const sidebarLink = page.locator('aside a[href="/optimization"]');
    check("the sidebar has the optimization item", (await sidebarLink.count()) === 1);
    await sidebarLink.click();
    await page.waitForURL(/\/optimization$/);
    await page.waitForSelector('[role="tab"]', { timeout: 20000 });

    const tabs = await page.$$eval('[role="tab"]', (elements) => elements.map((element) => element.innerText.trim()));
    const expectedTabs = TAB_HEADINGS.map(([english, hebrew]) => `${english}\n${hebrew}`);
    check("four tabs: the English name first, the Hebrew underneath", JSON.stringify(tabs) === JSON.stringify(expectedTabs), JSON.stringify(tabs));
    check("the shared date range opens on the last 7 days", (await page.getByRole("button", { name: /7 ימים אחרונים/ }).count()) >= 1);
    check("no analysis starts on load", runPosts === 0, `POST count=${runPosts}`);

    const header = await page.locator('section[aria-label="Run header"]').innerText();
    const headerOrder = ["Selected Date Range", "Campaign Status", "הרץ ניתוח", "Last run", "Run Range", "Data freshness"];
    const positions = headerOrder.map((label) => header.indexOf(label));
    check("the run header is in order: range, status, button, last run, run range, data freshness", positions.every((at, index) => at >= 0 && (index === 0 || at > positions[index - 1])), JSON.stringify(positions));
    check("the campaign status filter defaults to Active Only", (await page.locator('select[aria-label="Campaign Status"]').inputValue()) === "active");

    // The only way a new analysis starts is the button. This is the 7-day report.
    expectedPosts += 1;
    await page.getByRole("button", { name: "הרץ ניתוח" }).click();
    await page.waitForSelector('[role="tabpanel"] table', { timeout: 60000 });
    check("pressing the button starts exactly one analysis", runPosts === expectedPosts, `POST count=${runPosts}`);
    const exposureRows = await page.locator('[role="tabpanel"] tbody tr').count();
    check("the exposure tab lists the campaigns, with their ad sets and ads hidden", exposureRows >= 3, `rows=${exposureRows}`);
    const bodyText = await page.locator("body").innerText();
    check("the demo campaigns are shown", bodyText.includes("קמפיין AI - בינה מלאכותית"));
    const panelText = await page.locator('[role="tabpanel"]').innerText();
    check("the excluded recruitment campaign never appears as a row", !panelText.includes("דרושים"));
    check("the scope note states the exclusion by ID", bodyText.includes("120248773681350125"));
    check("the page says the advice is rules only, with no AI", bodyText.includes("ללא AI"));

    // Campaign Status: Active Only hides the paused demo campaign. All shows it, with the spend it had in the range.
    const savedRuns = await (await authedFetch(`${BASE}/api/optimization/runs`)).json();
    const latest = await (await authedFetch(`${BASE}/api/optimization/runs/${encodeURIComponent(savedRuns.runs[0].runId)}`)).json();
    const pausedUnit = latest.run.metricsSnapshot.entities.find((entity) => entity.level === "campaign" && entity.name === PAUSED_CAMPAIGN);
    check("the saved run holds the paused demo campaign with its spend", Boolean(pausedUnit) && pausedUnit.selected.spend > 0, `spend=${pausedUnit?.selected.spend}`);
    check("Active Only hides the paused campaign", !panelText.includes(PAUSED_CAMPAIGN));
    await page.locator('select[aria-label="Campaign Status"]').selectOption("all");
    await page.waitForFunction((name) => document.querySelector('[role="tabpanel"]')?.innerText.includes(name), PAUSED_CAMPAIGN, { timeout: 15000 });
    check("All shows the paused campaign with its historical spend", true);
    await page.locator('select[aria-label="Campaign Status"]').selectOption("active");

    // Horizontal scrolling: a synced bar above and below the table, the same as on the Leads page.
    const scrollBars = await page.locator('[role="tabpanel"] [style*="scrollbar-width"]').count();
    check("the exposure table has a synced scrollbar above and below", scrollBars >= 2, `bars=${scrollBars}`);
    const firstHeader = await page.locator('[role="tabpanel"] thead th').first().innerText();
    check("column headers: English first, Hebrew underneath", firstHeader.indexOf("Campaign") >= 0 && firstHeader.indexOf("Campaign") < firstHeader.indexOf("קמפיין"), JSON.stringify(firstHeader));

    // Tab switches and a reload never start an analysis.
    for (const name of TAB_NAMES) await page.getByRole("tab", { name }).click();
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[role="tab"]', { timeout: 20000 });
    check("tab switches and a reload start no analysis", runPosts === expectedPosts, `POST count=${runPosts}`);

    // Range state: the picker moves to Today, so the 7-day report is not shown. Running Today shows Today's run only.
    await page.getByRole("button", { name: /Selected Date Range/ }).click();
    await page.getByRole("menuitem", { name: "היום", exact: true }).click();
    await page.waitForSelector("text=הטווח השתנה. יש להריץ ניתוח מחדש.", { timeout: 15000 });
    check("a changed range says to run again, and no older result is shown", (await page.locator('[role="tabpanel"] table').count()) === 0);

    expectedPosts += 1;
    await page.getByRole("button", { name: "הרץ ניתוח" }).click();
    await page.waitForSelector('[role="tabpanel"] table', { timeout: 60000 });
    const today = reportingDay(0);
    const headerToday = await page.locator('section[aria-label="Run header"]').innerText();
    check("today's run shows today as its run range", headerToday.includes(`${dmy(today)} – ${dmy(today)}`), `expected ${dmy(today)} – ${dmy(today)}`);
    check("a run starts only with its button (Today)", runPosts === expectedPosts, `POST count=${runPosts}`);

    await page.getByRole("button", { name: /Selected Date Range/ }).click();
    await page.getByRole("menuitem", { name: "7 ימים אחרונים", exact: true }).click();
    await page.waitForSelector("text=הטווח השתנה. יש להריץ ניתוח מחדש.", { timeout: 15000 });
    check("moving back to 7 days does not show Today's result as the 7-day answer", (await page.locator('[role="tabpanel"] table').count()) === 0);

    expectedPosts += 1;
    await page.getByRole("button", { name: "הרץ ניתוח" }).click();
    await page.waitForSelector('[role="tabpanel"] table', { timeout: 60000 });
    check("the 7-day run is shown again, for its own range", (await page.locator('section[aria-label="Run header"]').innerText()).includes(" (7 ימים)"));

    // Sonil tab: a comparison only. A file is mapped by ID, checked, corrected and saved. Our saved run never changes.
    const runsList = await (await authedFetch(`${BASE}/api/optimization/runs`)).json();
    const runId = runsList.runs[0].runId;
    const before = await (await authedFetch(`${BASE}/api/optimization/runs/${encodeURIComponent(runId)}`)).json();
    const activeCampaigns = new Set(
      before.run.metricsSnapshot.entities.filter((entity) => entity.level === "campaign" && entity.status === "active").map((entity) => entity.id)
    );
    const adRow = before.run.metricsSnapshot.entities.find(
      (entity) => entity.level === "ad" && entity.selected.spend > 0 && entity.status === "active" && activeCampaigns.has(entity.campaignId)
    );
    check("the saved run has an active ad with spend to compare", Boolean(adRow));
    await page.getByRole("tab", { name: /Sunil Optimization/ }).click();
    const sonilIntro = await page.locator('[role="tabpanel"]').innerText();
    check("the Sonil tab says it is a comparison only", sonilIntro.includes("לשונית השוואה בלבד"));
    const csvText = [
      "ad_id,adset_id,campaign_id,date,spend,leads,recommendation",
      `${adRow.id},${adRow.parentId},${adRow.campaignId},${before.run.selected.since},${adRow.selected.spend},${adRow.selected.leads},לשמור`,
    ].join("\n");
    await page.locator('input[type="file"][aria-label="קובץ דוח סוניל"]').setInputFiles({
      name: "sonil-test.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvText, "utf8"),
    });
    await page.waitForSelector("text=מה יש בה (לפי התוכן)", { timeout: 20000 });
    for (const [role, column] of [["adId", "0"], ["adSetId", "1"], ["campaignId", "2"], ["date", "3"], ["spend", "4"], ["leads", "5"], ["recommendation", "6"]]) {
      await page.locator(`#sonil-role-${role}`).selectOption(column);
    }
    await page.getByRole("button", { name: "בדיקה והשוואה (לא נשמר)" }).click();
    await page.waitForSelector('select[id^="sonil-value-"]', { timeout: 20000 });
    await page.locator('select[id^="sonil-value-"]').first().selectOption("KEEP");
    await page.getByRole("button", { name: "בדיקה והשוואה (לא נשמר)" }).click();
    await page.waitForSelector("text=השוואה לפני שמירה", { timeout: 20000 });
    await page.getByRole("button", { name: "שמירה והשוואה" }).click();
    await page.waitForSelector("text=השוואה שנשמרה", { timeout: 20000 });
    const sonilRows = await page.locator('[role="tabpanel"] tbody tr').count();
    check("the saved comparison lists the matched ad", sonilRows >= 1, `rows=${sonilRows}`);
    const after = await (await authedFetch(`${BASE}/api/optimization/runs/${encodeURIComponent(runId)}`)).json();
    check("saving a Sonil file leaves our saved run exactly as it was", JSON.stringify(after.run) === JSON.stringify(before.run));
    check("saving a Sonil file starts no analysis", runPosts === expectedPosts, `POST count=${runPosts}`);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[role="tab"]', { timeout: 20000 });
    await page.getByRole("tab", { name: /Sunil Optimization/ }).click();
    // The saved import is read when the tab opens, so the test waits for it rather than counting at once.
    await page.waitForSelector("text=השוואה שנשמרה", { timeout: 20000 });
    check("the saved Sonil comparison survives a reload", true);

    // Summary: the campaign decisions come first, one row per campaign, then the high-priority actions.
    await page.getByRole("tab", { name: /Optimization Summary/ }).click();
    await page.waitForSelector("#campaign-decisions-heading", { timeout: 15000 });
    const headingsInOrder = await page.evaluate(() => {
      const decisions = document.getElementById("campaign-decisions-heading");
      const high = document.getElementById("high-priority-heading");
      return Boolean(decisions && high && decisions.compareDocumentPosition(high) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    check("the summary opens with the campaign decisions, before the high-priority actions", headingsInOrder);

    const decisionTable = page.locator('section[aria-labelledby="campaign-decisions-heading"]');
    const decisionHeader = await decisionTable.locator("thead").innerText();
    const expectedColumns = ["Campaign", "Decision", "Why", "Next Action", "Confidence"];
    check("the decisions table has its five columns", expectedColumns.every((name) => decisionHeader.includes(name)), decisionHeader.replace(/\n/g, " | "));
    const decisionLabels = ["KEEP", "WATCH", "INVESTIGATE", "PAUSE CANDIDATE", "SCALE CANDIDATE", "DATA CHECK", "INSUFFICIENT DATA"];
    const decisionRows = decisionTable.locator("tbody tr");
    const rowCount = await decisionRows.count();
    const decisionCells = await decisionRows.evaluateAll((rows) => rows.map((row) => row.querySelectorAll("td")[1]?.innerText.trim() ?? ""));
    const campaignIds = await decisionRows.evaluateAll((rows) => rows.map((row) => row.querySelector('td span[dir="ltr"]')?.innerText.trim() ?? ""));
    check("every campaign in scope has exactly one decision row", rowCount >= 1 && new Set(campaignIds).size === rowCount, `rows=${rowCount}`);
    check(
      "every row carries one of the seven decisions",
      decisionCells.length > 0 && decisionCells.every((text) => decisionLabels.some((label) => text.includes(label))),
      JSON.stringify(decisionCells)
    );

    // Status: a status is saved on an action, kept after a reload, and documented only. The per-unit detail is collapsed by
    // default, so it is opened first when no action of the high-priority list shows a status button.
    const firstStatusButton = async () => {
      const button = page.getByRole("button", { name: "בוצע", exact: true }).first();
      if (!(await button.isVisible().catch(() => false))) {
        await page.locator("summary", { hasText: "פירוט לפי קמפיין" }).click();
      }
      return page.getByRole("button", { name: "בוצע", exact: true }).first();
    };
    await (await firstStatusButton()).click();
    await page.waitForFunction(() => {
      const pressed = [...document.querySelectorAll('button[aria-pressed="true"]')];
      return pressed.some((button) => button.textContent.trim() === "בוצע");
    }, null, { timeout: 15000 });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[role="tab"]', { timeout: 20000 });
    await page.getByRole("tab", { name: /Optimization Summary/ }).click();
    const donePressed = await (await firstStatusButton()).getAttribute("aria-pressed");
    check("a recorded action status survives a reload", donePressed === "true", `aria-pressed=${donePressed}`);
    check("a status change still starts no analysis", runPosts === expectedPosts, `POST count=${runPosts}`);

    // Technical section: the landing capture diagnostic is read-only. In demo mode it says plainly that no real leads are read.
    await page.locator("summary", { hasText: "Technical diagnostics" }).click();
    await page.getByRole("button", { name: "הרץ אבחון קליטה (קריאה בלבד)" }).click();
    await page.waitForSelector("text=מצב הדגמה", { timeout: 20000 });
    check("the capture diagnostic says that demo mode reads no real leads", (await page.locator("text=מצב הדגמה").count()) >= 1);
    check("the capture diagnostic starts no analysis", runPosts === expectedPosts, `POST count=${runPosts}`);
    const rangeQuery = `since=${reportingDay(-6)}&until=${reportingDay(0)}`;
    // On a closed deployment the diagnostic does not exist, so an anonymous visitor gets a 404 and no data.
    const closedDiagnostic = await fetch(`${PUBLIC_BASE}/api/optimization/diagnostics/landing?${rangeQuery}`);
    check("the capture diagnostic does not exist on a closed deployment (404)", closedDiagnostic.status === 404, `status=${closedDiagnostic.status}`);
    const badCampaign = await authedFetch(`${BASE}/api/optimization/diagnostics/landing?${rangeQuery}&campaignId=abc`);
    check("the capture diagnostic rejects a campaign ID that is not a Meta ID", badCampaign.status === 400, `status=${badCampaign.status}`);

    // Leads tab: the same synced scrollbars as the exposure tab. RTL: scrollLeft runs from 0 down to a negative value.
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[role="tab"]', { timeout: 20000 });
    await page.getByRole("tab", { name: /Leads & Sales/ }).click();
    const leadsScrollBars = await page.locator('[role="tabpanel"] [style*="scrollbar-width"]').count();
    check("the leads table has a synced scrollbar above and below", leadsScrollBars >= 2, `bars=${leadsScrollBars}`);
    const leadsOverflow = await page.evaluate(() => {
      const container = document.querySelector('[role="tabpanel"] [data-slot="table-container"]');
      const bottom = document.querySelector('[role="tabpanel"] .sticky.bottom-0');
      if (!container || !bottom) return -1;
      bottom.scrollLeft = -150;
      return container.scrollWidth - container.clientWidth;
    });
    await page.waitForTimeout(250);
    const leadsFollowed = await page.evaluate(() => document.querySelector('[role="tabpanel"] [data-slot="table-container"]')?.scrollLeft ?? 0);
    check("the leads table follows its bottom scrollbar", leadsOverflow > 0 && leadsFollowed < 0, `overflow=${leadsOverflow}px, scrollLeft=${leadsFollowed}`);

    // Attribution Missing: the demo has no landing-page data, so a run is given attribution gaps here, and the notice must show
    // the count, never a zero. Only the GET of one saved run is changed; nothing is written.
    const runDetailPattern = /\/api\/optimization\/runs\/[^/]+$/;
    await page.route(runDetailPattern, async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      const response = await route.fetch();
      const body = await response.json();
      body.run.attributionGaps = { unassigned: 3, noIds: 3, idNotListed: 0, landing: 3 };
      await route.fulfill({ response, json: body });
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[role="tab"]', { timeout: 20000 });
    await page.getByRole("tab", { name: /Leads & Sales/ }).click();
    const attributionNotice = page.locator('section[aria-label="Attribution Missing"]');
    await attributionNotice.waitFor({ timeout: 15000 });
    const noticeText = await attributionNotice.innerText();
    check(
      "leads with no unit show Attribution Missing with their count",
      noticeText.includes("Attribution Missing") && noticeText.includes("3 לידים בטווח בלי שיוך מלא ליחידה"),
      noticeText.slice(0, 120)
    );
    await page.unroute(runDetailPattern);

    // Phone layout: no horizontal page scroll (wide tables scroll inside their own box).
    await page.setViewportSize(MOBILE);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[role="tab"]', { timeout: 20000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check("no horizontal page scroll on a phone", overflow <= 0, `overflow=${overflow}px`);

    check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
    await context.close();
  } finally {
    await browser.close();
  }
  console.log(results.join("\n"));
  console.log(failures.length ? `\n${failures.length} FAILED` : "\nALL CHECKS PASSED");
  process.exit(failures.length ? 1 : 0);
})().catch((error) => {
  // Print the checks that ran before the failure, so the report shows where it stopped.
  console.log(results.join("\n"));
  console.error(error);
  process.exit(1);
});
