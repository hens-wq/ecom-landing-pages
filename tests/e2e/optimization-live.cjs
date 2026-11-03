// The optimization centre without demo mode and without Meta or a database: every route refuses with an explicit
// Hebrew message, the page shows that message, and no demo campaign or recommendation appears. Run against the live
// server (LIVE_BASE_URL, started with no ECOM_DEMO_DATA flag).
const { chromium } = require("playwright");

const LIVE = process.env.LIVE_BASE_URL || "http://localhost:3200";
const results = [];
const failures = [];
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
  if (!ok) failures.push(name);
}

(async () => {
  const run = await fetch(`${LIVE}/api/optimization/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ since: "2026-10-27", until: "2026-11-02" }),
  });
  const runBody = await run.json().catch(() => ({}));
  check(
    "live: a run is refused with an explicit message, not a report",
    run.status === 503 && typeof runBody?.error?.message === "string" && runBody.error.message.length > 0,
    `status=${run.status}`
  );
  check("live: a refused run shows no recommendations", !("run" in runBody));

  const list = await fetch(`${LIVE}/api/optimization/runs`);
  check("live: the saved-run list is refused, not shown as empty", list.status === 503, `status=${list.status}`);

  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext({ locale: "he-IL" })).newPage();
    await page.goto(`${LIVE}/optimization`, { waitUntil: "networkidle" });
    await page.waitForSelector('p[role="alert"]', { timeout: 20000 });
    const alertText = await page.locator('p[role="alert"]').innerText();
    check("live: the page shows the refusal message", alertText.trim().length > 0, alertText.slice(0, 80));
    const bodyText = await page.locator("body").innerText();
    check("live: no demo campaign is shown", !bodyText.includes("קמפיין AI - בינה מלאכותית"));
    check("live: no demo report label is shown", !bodyText.includes("מצב דמו"));
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
