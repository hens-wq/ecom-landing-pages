// Access checks for the team sign-in, against one server (SECURITY_BASE, or BASE_URL). Without a session every private page
// redirects to the sign-in page and every private API answers 401 with no data. The public routes stay open as designed: the
// sign-in page, the creative page, and the two routes that check their own Bearer secret (Make's webhook and the landing
// leads POST). A signed-in browser gets its data, and sign-out ends the session on that browser.
const { chromium } = require("playwright");
const { DESKTOP, authedFetch, signInCookie } = require("./fixtures.cjs");

const BASE_URL = process.env.SECURITY_BASE || process.env.BASE_URL || "http://localhost:3100";
const PASSWORD = process.env.DASHBOARD_PASSWORD || "";
const results = [];
const failures = [];
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
  if (!ok) failures.push(name);
}

const RANGE = "since=2026-11-03&until=2026-11-03";
const PRIVATE_PAGES = ["/", "/leads", "/optimization", "/integrations", "/sales-matching"];
const PRIVATE_APIS = [
  ["GET", `/api/leads?${RANGE}`],
  ["GET", `/api/leads/export-xlsx?${RANGE}`],
  ["GET", `/api/landing-leads?${RANGE}`],
  ["GET", `/api/advertising?${RANGE}`],
  ["GET", "/api/campaign-status"],
  ["GET", `/api/lead-facts?${RANGE}`],
  ["GET", "/api/lead-status/health"],
  ["GET", "/api/lead-status/missing-payment"],
  ["GET", "/api/admin/orphan-status-rows"],
  ["POST", "/api/admin/orphan-status-rows"],
  ["POST", "/api/lead-status"],
  ["POST", "/api/lead-status/batch"],
  ["GET", "/api/optimization/runs"],
  ["POST", "/api/optimization/runs"],
  ["GET", "/api/optimization/runs/no-such-run"],
  ["PATCH", "/api/optimization/runs/no-such-run/actions"],
  ["GET", "/api/optimization/runs/no-such-run/sonil"],
  ["POST", "/api/optimization/runs/no-such-run/sonil"],
  ["POST", "/api/optimization/runs/no-such-run/sonil/preview"],
];

async function refused(method, path, extra = {}) {
  const response = await fetch(`${BASE_URL}${path}`, { method, redirect: "manual", headers: { "Content-Type": "application/json" }, ...extra });
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  return { status: response.status, body, text };
}

(async () => {
  // 1. Without a session: private APIs answer 401 and carry no data.
  for (const [method, path] of PRIVATE_APIS) {
    const response = await refused(method, path, method === "GET" ? {} : { body: "{}" });
    const code = response.body?.error?.code;
    check(`no session: ${method} ${path.split("?")[0]} is refused`, response.status === 401 && code === "unauthenticated", `status=${response.status} code=${code}`);
  }

  // 2. Without a session: private pages go to the sign-in page, with the page they asked for kept.
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: DESKTOP, locale: "he-IL" });
    const page = await context.newPage();
    for (const path of PRIVATE_PAGES) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
      const url = new URL(page.url());
      check(`no session: ${path} shows the sign-in page`, url.pathname === "/login", `landed on ${url.pathname}`);
    }
    await page.goto(`${BASE_URL}/leads`, { waitUntil: "networkidle" });
    check("sign-in keeps the page that was asked for", new URL(page.url()).searchParams.get("next") === "/leads");
    check("the sign-in page shows the password form", (await page.locator('input[name="password"]').count()) === 1);

    // 3. Sign in through the page, then the dashboard opens.
    await page.locator('input[name="password"]').fill("definitely-not-the-password");
    await page.getByRole("button", { name: "כניסה", exact: true }).click();
    await page.waitForSelector('p[role="alert"]', { timeout: 15000 });
    check("a wrong password is refused on the page", (await page.locator('p[role="alert"]').innerText()).includes("הסיסמה שגויה"));
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.getByRole("button", { name: "כניסה", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/leads", { timeout: 20000 });
    check("after signing in the page asked for opens", new URL(page.url()).pathname === "/leads");

    // 4. Sign out from the sidebar: the browser is sent back to the sign-in page, and the private pages close again.
    await page.getByRole("button", { name: "יציאה מהמערכת" }).click();
    await page.waitForURL((url) => url.pathname === "/login", { timeout: 15000 });
    await page.goto(`${BASE_URL}/leads`, { waitUntil: "networkidle" });
    check("after sign-out the leads page is closed again", new URL(page.url()).pathname === "/login");
    await context.close();
  } finally {
    await browser.close();
  }

  // 5. The sign-in endpoint: a wrong password gives no cookie; the right one gives a protected cookie.
  const wrong = await refused("POST", "/api/auth/login", { body: JSON.stringify({ password: "wrong-password-value" }) });
  check("API: a wrong password gives 401 and no cookie", wrong.status === 401 && wrong.body?.error?.code === "invalid_password");
  const right = await fetch(`${BASE_URL}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: PASSWORD }) });
  const setCookie = right.headers.getSetCookie().find((line) => line.startsWith("ecom_session="));
  check("API: the right password sets the session cookie", right.status === 200 && Boolean(setCookie));
  check("the cookie is HttpOnly, Secure, SameSite=Lax and limited to the site", /HttpOnly/i.test(setCookie) && /Secure/i.test(setCookie) && /SameSite=Lax/i.test(setCookie) && /Path=\//.test(setCookie) && /Max-Age=\d+/.test(setCookie), setCookie?.split(";").slice(1).join(";"));

  // 6. With the session: the data routes answer (their own results, not a refusal), and the session status says so.
  const cookie = await signInCookie(BASE_URL);
  const session = await (await authedFetch(`${BASE_URL}/api/auth/session`)).json();
  check("with the session: the session status reports signed in", session.authenticated === true);
  const leads = await authedFetch(`${BASE_URL}/api/leads?${RANGE}`);
  check("with the session: the leads route answers with its own result", leads.status !== 401, `status=${leads.status}`);
  const bothSaveCookie = cookie.startsWith("ecom_session=");
  check("the session cookie used in these checks is the one the server issued", bothSaveCookie);

  // 7. Public routes stay public, and answer by their own rules rather than the sign-in page.
  const login = await fetch(`${BASE_URL}/login`, { redirect: "manual" });
  check("public: the sign-in page loads without a session", login.status === 200);
  const creative = await fetch(`${BASE_URL}/creative/ad-security-check`, { redirect: "manual" });
  check("public: the creative page is not sent to the sign-in page", creative.status !== 307 && creative.status !== 302, `status=${creative.status}`);
  const webhookNoSecret = await refused("POST", "/api/webhooks/lead-status", { body: "{}" });
  check("public: Make's webhook refuses a request without its Bearer secret (its own check, not the sign-in gate)", webhookNoSecret.status !== 302 && webhookNoSecret.body?.error?.code !== "unauthenticated", `status=${webhookNoSecret.status}`);
  const landingNoSecret = await refused("POST", "/api/landing-leads", { body: "{}" });
  check("public: the landing leads POST refuses without its Bearer secret (its own check)", landingNoSecret.status !== 302 && landingNoSecret.body?.error?.code !== "unauthenticated", `status=${landingNoSecret.status}`);

  console.log(results.join("\n"));
  console.log(failures.length ? `\n${failures.length} FAILED` : "\nALL CHECKS PASSED");
  process.exit(failures.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
