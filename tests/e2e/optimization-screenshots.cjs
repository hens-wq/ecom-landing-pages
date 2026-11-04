// Screenshots of the optimization centre for two ranges (Today, and the last 7 days) at 1366 px, on demo data only.
// Each run is started by its own button. The check also moves the bottom scrollbar and confirms that the table follows it.
// Usage: node tests/e2e/optimization-screenshots.cjs <output directory>
const path = require("path");
const { chromium } = require("playwright");
const { BASE, newAuthedContext } = require("./fixtures.cjs");

const OUT = process.argv[2];
if (!OUT) {
  console.error("usage: node tests/e2e/optimization-screenshots.cjs <output directory>");
  process.exit(2);
}

async function startAnalysis(page) {
  await page.getByRole("button", { name: "הרץ ניתוח" }).click();
  await page.waitForSelector('[role="tabpanel"] table', { timeout: 60000 });
  await page.waitForTimeout(300);
}

async function scrollCheck(page) {
  const first = await page.evaluate(() => {
    const container = document.querySelector('[role="tabpanel"] [data-slot="table-container"]');
    const bottom = document.querySelector('[role="tabpanel"] .sticky.bottom-0');
    if (!container || !bottom) return { found: false };
    // The page is RTL, so scrollLeft runs from 0 down to a negative value: scroll the bar to -150.
    bottom.scrollLeft = -150;
    return { found: true, overflowPx: container.scrollWidth - container.clientWidth, before: container.scrollLeft };
  });
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => document.querySelector('[role="tabpanel"] [data-slot="table-container"]')?.scrollLeft ?? 0);
  return { ...first, afterBarScroll: after, synced: after < 0 };
}

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await newAuthedContext(browser, {
      viewport: { width: 1366, height: 900 },
      deviceScaleFactor: 2,
      locale: "he-IL",
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/optimization`, { waitUntil: "networkidle" });
    await page.waitForSelector('[role="tab"]', { timeout: 20000 });

    // Today.
    await page.getByRole("button", { name: /Selected Date Range/ }).click();
    await page.getByRole("menuitem", { name: "היום", exact: true }).click();
    await startAnalysis(page);
    const todayScroll = await scrollCheck(page);
    console.log(`TODAY header: ${JSON.stringify(await page.locator('section[aria-label="Run header"]').innerText())}`);
    console.log(`TODAY scroll: ${JSON.stringify(todayScroll)}`);
    await page.locator('[role="tabpanel"] [data-slot="table-container"]').first().evaluate((node) => {
      node.scrollLeft = 0;
    });
    await page.screenshot({ path: path.join(OUT, "optimization-today-1366.png") });

    // Last 7 days.
    await page.getByRole("button", { name: /Selected Date Range/ }).click();
    await page.getByRole("menuitem", { name: "7 ימים אחרונים", exact: true }).click();
    await startAnalysis(page);
    const last7Scroll = await scrollCheck(page);
    console.log(`LAST7 header: ${JSON.stringify(await page.locator('section[aria-label="Run header"]').innerText())}`);
    console.log(`LAST7 scroll: ${JSON.stringify(last7Scroll)}`);
    await page.locator('[role="tabpanel"] [data-slot="table-container"]').first().evaluate((node) => {
      node.scrollLeft = 0;
    });
    await page.screenshot({ path: path.join(OUT, "optimization-last7-1366.png") });
    console.log("screenshots written");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
