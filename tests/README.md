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
- `exports.cjs`: the agent CSV leaves out the excluded campaign's leads, and keeps the course leads.
- `optimization.cjs`: the optimization centre (demo data): the sidebar item, the four tabs, the shared date range, no
  analysis on load, a tab switch or a reload (only the button starts one), the Sonil comparison (upload, mapping by ID,
  check, save; the saved run is unchanged and no analysis starts), saved action statuses, the phone layout.
- `live-mode.cjs`: with no demo flag and no Meta settings, every Meta-backed route returns an explicit error, the
  export refuses to run, and no demo numbers appear.
- `optimization-live.cjs`: the optimization centre without demo mode or Meta/database settings: every route refuses with
  an explicit message, and the page shows it without demo data.

The optimization unit tests (`tests/unit/optimization-*.test.ts`) cover the spec's ten mandatory checks (section 18),
the period rules (no overlap, partial today), every threshold band, the level and conflict rules, and the guards: no AI
call, no write to Meta, and pure rule modules.

`tests/unit/reach-levels.test.ts` checks that reach is never a sum: a campaign's or ad set's reach is Meta's own level
reach, its frequency is its own impressions over that reach, and missing reach is unknown, never zero. It also checks
the exact Meta read shapes (the excluded campaign is filtered by ID) and that demo reach stays within its bounds.

`tests/unit/sonil-*.test.ts` cover the Sonil comparison: reading XLSX and CSV (encodings, delimiters, rounded numeric IDs,
the zip size guard), the mapping rules, matching by ID only, the checks against the saved run, the comparison with our
recommendations (which stay unchanged), and the static guards (no network, no AI, no Meta call).
