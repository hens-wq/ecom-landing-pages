// Runs every browser suite. The demo suites need a server started with ECOM_DEMO_DATA=1 at BASE_URL (default
// http://localhost:3100). The live-mode suite needs a second server with NO demo flag at LIVE_BASE_URL.
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const demoSuites = ["dashboard.cjs", "leads.cjs", "leads-extra.cjs", "period-spend.cjs"];
let failed = 0;

for (const file of demoSuites) {
  const result = spawnSync(process.execPath, [path.join(__dirname, file)], { stdio: "inherit", env: process.env });
  if (result.status !== 0) failed += 1;
}

if (process.env.LIVE_BASE_URL) {
  const result = spawnSync(process.execPath, [path.join(__dirname, "live-mode.cjs")], { stdio: "inherit", env: process.env });
  if (result.status !== 0) failed += 1;
} else {
  console.log("LIVE_BASE_URL is not set: skipping live-mode.cjs (it needs a server started without ECOM_DEMO_DATA).");
}

console.log(failed ? `\n${failed} suite(s) failed` : "\nAll browser suites passed");
process.exit(failed ? 1 : 0);
