// Integration and access checks against the demo server (BASE_URL, default http://localhost:3100). There is no sign-in: the
// dashboard and its data routes answer without a login, as they did before any team password existed. What this file checks
// is the rest of the contract: the routes that carry their own Bearer secret refuse a request without it, the creative page
// stays reachable for reps, and no sign-in page exists. Only GET requests reach the data routes here, so no analysis starts
// and no data changes.

const BASE_URL = process.env.BASE_URL || "http://localhost:3100";
const RANGE = "since=2026-11-03&until=2026-11-03";
const PAGES = ["/", "/leads", "/optimization", "/integrations", "/sales-matching"];

const results = [];
const failures = [];
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
  if (!ok) failures.push(name);
}

async function call(method, path, extra = {}) {
  const response = await fetch(`${BASE_URL}${path}`, { method, redirect: "manual", headers: { "Content-Type": "application/json" }, ...extra });
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

(async () => {
  try {
    // Routes with their own Bearer secret: refused without it, with an error status and no data.
    const webhook = await call("POST", "/api/webhooks/lead-status", { body: "{}" });
    check("Make's webhook refuses a request without its Bearer secret", webhook.status >= 400 && !carriesLeadData(webhook.text), `status=${webhook.status}`);

    const landing = await call("POST", "/api/landing-leads", { body: "{}" });
    check("the landing leads POST refuses a request without its Bearer secret", landing.status >= 400 && !carriesLeadData(landing.text), `status=${landing.status}`);

    const orphans = await call("GET", "/api/admin/orphan-status-rows");
    check("the admin route refuses a request without its Bearer secret", orphans.status >= 400 && !carriesLeadData(orphans.text), `status=${orphans.status}`);

    // The creative page stays reachable for reps, and nothing sends the visitor to a sign-in page.
    const creative = await call("GET", "/creative/ad-security-check");
    check("the creative page is reachable and not sent to a sign-in page", creative.status !== 302 && creative.status !== 307 && !creative.location, `status=${creative.status}`);

    // No sign-in page exists.
    const login = await call("GET", "/login");
    check("there is no sign-in page", login.status === 404, `status=${login.status}`);

    // The dashboard opens without a login.
    for (const path of PAGES) {
      const response = await call("GET", path);
      check(`${path} opens without a sign-in`, response.status === 200 && !(response.location ?? "").includes("/login"), `status=${response.status}`);
    }

    // The data routes answer with their own results (demo data).
    const leads = await call("GET", `/api/leads?${RANGE}`);
    check("the leads route answers with its own result", leads.status === 200, `status=${leads.status}`);

    const advertising = await call("GET", `/api/advertising?${RANGE}`);
    check("the advertising route answers with its own result", advertising.status === 200, `status=${advertising.status}`);
  } catch (error) {
    console.error(`Could not reach the server (${error.message}). Start it as tests/README.md describes, then run again.`);
    process.exit(1);
  }
  console.log(results.join("\n"));
  console.log(failures.length ? `\n${failures.length} FAILED` : "\nALL CHECKS PASSED");
  process.exit(failures.length ? 1 : 0);
})();
