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
- `optimization.cjs`: the optimization centre (demo data): the sidebar item, the four tabs (English name first, Hebrew
  underneath), the run header order, no analysis on load, a tab switch or a reload (only the button starts one), the range
  state (a changed picker says to run again, and an older report is never shown for another range), the Campaign Status
  scope (Active Only hides the paused demo campaign, All shows it with its spend), the synced scrollbars of the exposure and
  leads tables, the Attribution Missing notice (on a run given attribution gaps), the Sonil comparison (upload, mapping by ID,
  check, save; the saved run is unchanged and no analysis starts), saved action statuses, the phone layout.
- `optimization-screenshots.cjs`: not part of `run-all`. It runs Today and the last 7 days at 1366 px, saves one screenshot
  of each to the folder given on the command line, and checks that the bottom scrollbar moves the table. Demo data only.
- `security.cjs`: the team sign-in, against the demo server and the live server. Without a session every private page
  goes to the sign-in page and every private API answers 401 with no data. With the session the data routes answer. Sign-out
  closes the pages again. The public routes stay open as designed: the sign-in page, the creative page, Make's webhook and
  the landing leads POST, each with its own Bearer check. Run it with `DASHBOARD_PASSWORD` set to the server's password.
- `live-mode.cjs`: with no demo flag and no Meta settings, every Meta-backed route returns an explicit error, the
  export refuses to run, and no demo numbers appear.
- `optimization-live.cjs`: the optimization centre without demo mode or Meta/database settings: every route refuses with
  an explicit message, and the page shows it without demo data.

`tests/unit/sonil-xlsx-safety.test.ts` builds each dangerous XLSX in memory (`zip-fixtures.ts`) and checks it is refused:
macro projects, macro-enabled workbooks, XML entity declarations, and a deflate bomb that declares a small size. It also
checks that formulas keep their stored values and are never evaluated.

`tests/unit/auth-token.test.ts` and `tests/unit/auth-limiter.test.ts` cover the session rules: signed tokens and their
expiry, constant-time password checks, the minimum lengths of the password and the secret, the sign-in redirect, the public
allowlist, and the failed-sign-in brake.

The optimization unit tests (`tests/unit/optimization-*.test.ts`) cover the spec's ten mandatory checks (section 18),
the period rules (no overlap, partial today), every threshold band, the level and conflict rules, and the guards: no AI
call, no write to Meta, and pure rule modules.

`tests/unit/optimization-attribution.test.ts` checks how leads are attached to units by ID only: a lead with no ID or
with an unlisted ID is a gap (never a zero), a zero is confirmed only when every lead of the window carries an ID, and a
landing-page lead raises no tracking verdict. `tests/unit/landing-leads-ids.test.ts` checks that Meta IDs keep every digit
(an unquoted 18-digit number is read as text), that placeholders are refused, and that a numeric `utm_campaign` is used only
as an ID. `tests/unit/lead-data-state.test.ts` checks the states (confirmed zero, attribution missing, source mismatch, data
unavailable, no delivery). `tests/unit/campaign-filter-range-format.test.ts` checks the Campaign Status scope, the range
state of a saved report, and the date and time formats.

`tests/unit/reach-levels.test.ts` checks that reach is never a sum: a campaign's or ad set's reach is Meta's own level
reach, its frequency is its own impressions over that reach, and missing reach is unknown, never zero. It also checks
the exact Meta read shapes (the excluded campaign is filtered by ID) and that demo reach stays within its bounds.

`tests/unit/sonil-*.test.ts` cover the Sonil comparison: reading XLSX and CSV (encodings, delimiters, rounded numeric IDs,
the zip size guard), the mapping rules, matching by ID only, the checks against the saved run, the comparison with our
recommendations (which stay unchanged), and the static guards (no network, no AI, no Meta call).
