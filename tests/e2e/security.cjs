// Access-rule checks against two servers that the README starts. There is no sign-in any more: the rule is the deployment's.
//  - PUBLIC_BASE_URL (default http://localhost:3300): a CLOSED deployment, with no ECOM_ADMIN_ACCESS. Every private page and
//    API answers 404 with no data. The public routes keep working by their own rules: the creative page, Make's webhook and
//    the landing leads POST, each with its own Bearer check.
//  - BASE_URL (default http://localhost:3100): an OPEN deployment (ECOM_ADMIN_ACCESS=vercel-protected, demo data). The
//    dashboard and the data routes answer, and no sign-in page exists anywhere.
// Only GET requests reach the open server, so these checks never start an analysis or change data.

const PUBLIC_BASE = process.env.PUBLIC_BASE_URL || "http://localhost:3300";
const OPEN_BASE = process.env.BASE_URL || "http://localhost:3100";
const RANGE = "since=2026-11-03&until=2026-11-03";
/** The exact body of the access gate's 404 for a page. A route that answers by its own rules never sends it. */
const GATE_PAGE_BODY = "לא נמצא.";

const PRIVATE_PAGES = ["/", "/leads", "/optimization", "/integrations", "/sales-matching", "/login"];
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
  ["GET", "/api/optimization/diagnostics/landing"],
];

const results = [];
const failures = [];
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
  if (!ok) failures.push(name);
}

async function call(base, method, path, extra = {}) {
  const response = await fetch(`${base}${path}`, { method, redirect: "manual", headers: { "Content-Type": "application/json" }, ...extra });
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  return { status: response.status, location: response.headers.get("location"), body, text };
}

/** Words that appear only in a lead record. A refusal must carry none of them. */
function carriesLeadData(text) {
  return /phone|email|normalizedPhone|"name"/i.test(text);
}

async function closedDeployment() {
  for (const path of PRIVATE_PAGES) {
    const response = await call(PUBLIC_BASE, "GET", path);
    check(`closed: ${path} does not exist (404), and nothing sends the visitor to a sign-in page`, response.status === 404 && !response.location, `status=${response.status}`);
  }

  for (const [method, path] of PRIVATE_APIS) {
    const response = await call(PUBLIC_BASE, method, path, method === "GET" ? {} : { body: "{}" });
    check(`closed: ${method} ${path.split("?")[0]} does not exist (404), with no data`, response.status === 404 && !carriesLeadData(response.text), `status=${response.status}`);
  }

  // The public routes keep working by their own rules, never by the gate's.
  const creative = await call(PUBLIC_BASE, "GET", "/creative/ad-security-check");
  check("closed: the creative page is reached (the gate does not answer it)", creative.status !== 302 && creative.text !== GATE_PAGE_BODY, `status=${creative.status}`);

  const webhook = await call(PUBLIC_BASE, "POST", "/api/webhooks/lead-status", { body: "{}" });
  check("closed: Make's webhook answers with its own Bearer check (not the gate)", webhook.status !== 404 && webhook.body?.error?.code !== "not_found", `status=${webhook.status}`);

  const landing = await call(PUBLIC_BASE, "POST", "/api/landing-leads", { body: "{}" });
  check("closed: the landing leads POST answers with its own Bearer check (not the gate)", landing.status !== 404 && landing.body?.error?.code !== "not_found", `status=${landing.status}`);
}

async function openDeployment() {
  const login = await call(OPEN_BASE, "GET", "/login");
  check("open: there is no sign-in page at all", login.status === 404, `status=${login.status}`);

  for (const path of ["/", "/leads", "/optimization", "/integrations", "/sales-matching"]) {
    const response = await call(OPEN_BASE, "GET", path);
    check(`open: ${path} opens without a sign-in`, response.status === 200 && !(response.location ?? "").includes("/login"), `status=${response.status}`);
  }

  const leads = await call(OPEN_BASE, "GET", `/api/leads?${RANGE}`);
  check("open: the leads route answers with its own result", leads.status === 200, `status=${leads.status}`);

  const advertising = await call(OPEN_BASE, "GET", `/api/advertising?${RANGE}`);
  check("open: the advertising route answers with its own result", advertising.status === 200, `status=${advertising.status}`);
}

(async () => {
  try {
    await closedDeployment();
    await openDeployment();
  } catch (error) {
    console.error(`Could not reach the servers (${error.message}). Start them as tests/README.md describes, then run again.`);
    process.exit(1);
  }
  console.log(results.join("\n"));
  console.log(failures.length ? `\n${failures.length} FAILED` : "\nALL CHECKS PASSED");
  process.exit(failures.length ? 1 : 0);
})();
