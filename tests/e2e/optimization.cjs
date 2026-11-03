// Browser checks for the optimization centre, on demo data only. Covers: the sidebar item, the four tabs, the shared date
// range, that no analysis starts on load, a tab switch or a reload (only the button starts one), saved action statuses,
// and the phone layout. Demo data is synthetic; nothing here touches Meta or the database.
const { chromium } = require("playwright");
const { BASE, DESKTOP } = require("./fixtures.cjs");

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
    const context = await browser.newContext({ viewport: DESKTOP, locale: "he-IL" });
    const page = await context.newPage();
    const consoleErrors = [];
    let runPosts = 0;
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/api/optimization/runs")) runPosts += 1;
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

    // Sonil queue: every card carries the full format.
    await page.getByRole("tab", { name: "אופטימיזציית סוניל" }).click();
    const cards = await page.locator('[role="tabpanel"] article').count();
    check("the Sonil queue shows each recommendation as a card", cards >= 1, `cards=${cards}`);
    const cardText = cards > 0 ? await page.locator('[role="tabpanel"] article').first().innerText() : "";
    for (const label of ["הכלל שהופעל", "הסיבה", "רמת ביטחון", "נתונים חסרים", "הבדיקה הבאה"]) {
      check(`a card shows "${label}"`, cardText.includes(label));
    }

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
