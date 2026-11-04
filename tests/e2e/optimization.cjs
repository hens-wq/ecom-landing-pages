// Browser checks for the optimization centre, on demo data only. Covers: the sidebar item, the four tabs, the shared date
// range, that no analysis starts on load, a tab switch or a reload (only the button starts one), the Sonil comparison (upload,
// mapping by ID, check, save), saved action statuses, and the phone layout. Demo data is synthetic; nothing here touches Meta or the database.
const { chromium } = require("playwright");
const { BASE, DESKTOP, authedFetch, newAuthedContext } = require("./fixtures.cjs");

const MOBILE = { width: 390, height: 844 };
const TAB_NAMES = ["חשיפה ותנועה", "לידים ומכירות", "אופטימיזציית סוניל", "סיכום אופטימיזציה"];
const results = [];
const failures = [];
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
  if (!ok) failures.push(name);
}

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await newAuthedContext(browser, { viewport: DESKTOP, locale: "he-IL" });
    const page = await context.newPage();
    const consoleErrors = [];
    let runPosts = 0;
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

    const tabs = await page.$$eval('[role="tab"]', (elements) => elements.map((element) => element.textContent.trim()));
    check("four tabs with the spec's names", JSON.stringify(tabs) === JSON.stringify(TAB_NAMES), JSON.stringify(tabs));
    check("the shared date range opens on the last 7 days", (await page.getByRole("button", { name: /7 ימים אחרונים/ }).count()) >= 1);
    check("no analysis starts on load", runPosts === 0, `POST count=${runPosts}`);

    // The only way a new analysis starts is the button.
    await page.getByRole("button", { name: "הרץ ניתוח" }).click();
    await page.waitForSelector('[role="tabpanel"] table', { timeout: 60000 });
    check("pressing the button starts exactly one analysis", runPosts === 1, `POST count=${runPosts}`);
    const exposureRows = await page.locator('[role="tabpanel"] tbody tr').count();
    check("the exposure tab lists the campaigns, with their ad sets and ads hidden", exposureRows >= 3, `rows=${exposureRows}`);
    const bodyText = await page.locator("body").innerText();
    check("the demo campaigns are shown", bodyText.includes("קמפיין AI - בינה מלאכותית"));
    const panelText = await page.locator('[role="tabpanel"]').innerText();
    check("the excluded recruitment campaign never appears as a row", !panelText.includes("דרושים"));
    check("the scope note states the exclusion by ID", bodyText.includes("120248773681350125"));
    check("the page says the advice is rules only, with no AI", bodyText.includes("ללא AI"));

    // Tab switches and a reload never start an analysis.
    for (const name of TAB_NAMES) await page.getByRole("tab", { name }).click();
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[role="tab"]', { timeout: 20000 });
    check("tab switches and a reload start no analysis", runPosts === 1, `POST count=${runPosts}`);

    // Sonil tab: a comparison only. A file is mapped by ID, checked, corrected and saved. Our saved run never changes.
    const runsList = await (await authedFetch(`${BASE}/api/optimization/runs`)).json();
    const runId = runsList.runs[0].runId;
    const before = await (await authedFetch(`${BASE}/api/optimization/runs/${encodeURIComponent(runId)}`)).json();
    const adRow = before.run.metricsSnapshot.entities.find((entity) => entity.level === "ad" && entity.selected.spend > 0);
    check("the saved run has an ad with spend to compare", Boolean(adRow));
    await page.getByRole("tab", { name: "אופטימיזציית סוניל" }).click();
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
    check("saving a Sonil file starts no analysis", runPosts === 1, `POST count=${runPosts}`);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[role="tab"]', { timeout: 20000 });
    await page.getByRole("tab", { name: "אופטימיזציית סוניל" }).click();
    // The saved import is read when the tab opens, so the test waits for it rather than counting at once.
    await page.waitForSelector("text=השוואה שנשמרה", { timeout: 20000 });
    check("the saved Sonil comparison survives a reload", true);

    // Summary: a status is saved, kept after a reload, and documented only.
    await page.getByRole("tab", { name: "סיכום אופטימיזציה" }).click();
    await page.getByRole("button", { name: "בוצע", exact: true }).first().click();
    await page.waitForFunction(() => {
      const pressed = [...document.querySelectorAll('button[aria-pressed="true"]')];
      return pressed.some((button) => button.textContent.trim() === "בוצע");
    }, null, { timeout: 15000 });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[role="tab"]', { timeout: 20000 });
    await page.getByRole("tab", { name: "סיכום אופטימיזציה" }).click();
    const donePressed = await page.getByRole("button", { name: "בוצע", exact: true }).first().getAttribute("aria-pressed");
    check("a recorded action status survives a reload", donePressed === "true", `aria-pressed=${donePressed}`);
    check("a status change still starts no analysis", runPosts === 1, `POST count=${runPosts}`);

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
  console.error(error);
  process.exit(1);
});
