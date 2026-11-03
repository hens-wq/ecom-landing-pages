# Tests

Regression tests for the dashboard and the Leads page. They use synthetic fixtures only: no names, phone numbers,
account identifiers or secrets are stored here.

## Unit tests

```bash
npm run test:unit
```

Runs the Node test runner through `tsx` (`tests/unit/*.test.ts`), then the pure-logic checks in
`tests/unit/performance.checks.mts`. They need no server and no network.

## Browser tests

Start the app in two modes, then run the suites:

```bash
# Demo data, for the dashboard and Leads checks (explicit test mode only)
ECOM_DEMO_DATA=1 npm run start -- -p 3100

# Live mode without Meta settings, for the "no demo data in live mode" checks
npm run start -- -p 3200

# In another shell
npm run build                       # once, before starting the servers
BASE_URL=http://localhost:3100 LIVE_BASE_URL=http://localhost:3200 npm run test:e2e
```

The suites use Playwright's `playwright` package and a Chromium it can launch. Screenshots go to
`tests/e2e/output/` (ignored by git).

- `dashboard.cjs`: dashboard KPIs, hierarchy, sorting, refresh, warnings, mobile layout.
- `leads.cjs`: Leads KPIs, the dashboard-to-Leads agreement on the same data, date presets, source filter.
- `leads-extra.cjs`: the demo-mode guard on Leads and the mobile layout.
- `period-spend.cjs`: the selected-period spend for every preset and the custom range, and the warnings for a
  reconciliation that passes, has a gap, or cannot be checked.
- `live-mode.cjs`: with no demo flag and no Meta settings, every Meta-backed route returns an explicit error, the
  export refuses to run, and no demo numbers appear.
