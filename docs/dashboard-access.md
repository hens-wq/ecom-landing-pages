# Dashboard access

The app has no sign-in of its own, and no team password. Who may reach the private area is decided by the deployment.

## The rule (src/lib/auth/mode.ts)

- **Vercel Preview:** open. Vercel Deployment Protection is the gate, so it must cover Preview deployments.
- **Any other run** (production, local, unknown): closed, unless `ECOM_ADMIN_ACCESS` is exactly `vercel-protected`.
- **Closed:** every private page and API answers 404, as if it did not exist. The public routes keep their own checks.

Private area = the dashboard pages and every route that reads or changes lead data.
Public routes = `/creative/*` (reps' creative pages), `POST /api/landing-leads` (Bearer), `/api/webhooks/lead-status` (Bearer).

## Two Vercel projects, one repository

Vercel Deployment Protection applies to a whole deployment, not to a path. The public routes must stay reachable by Make and by
reps, so the dashboard cannot live on the same deployment as Make's webhook.

**Public project (the permanent domain, as today)**
- Do not set `ECOM_ADMIN_ACCESS`. Private pages and APIs answer 404.
- Keep `LEAD_STATUS_WEBHOOK_SECRET` and `LANDING_LEADS_API_SECRET`.
- Deployment Protection stays off here. Turning it on would block Make and the creative pages.
- `DASHBOARD_PASSWORD` and `SESSION_SECRET` are no longer read and can be removed.

**Admin project (the dashboard)**
- A second Vercel project from the same repository, on its own domain.
- Set `ECOM_ADMIN_ACCESS=vercel-protected` for Production only.
- Turn on Vercel Deployment Protection for this project's Production deployments, so it covers the admin domain.
- Set the data variables it needs: the database, Meta, the reporting timezone, and the admin route secret.

**Preview deployments** of the public project are open to the app by design (`VERCEL_ENV=preview`). Check that Vercel
Deployment Protection covers them, and that the Preview database is one you accept for this.

## Verify with no cookies (replace the domains)

```bash
# Admin: no app page or data without Vercel's login
curl -sI https://<admin-domain>/                      # expect a redirect to Vercel's login, not 200 from the app
curl -s  "https://<admin-domain>/api/leads?since=2026-11-03&until=2026-11-03"   # no lead data

# Public: private pages and APIs do not exist
curl -s -o /dev/null -w "%{http_code}\n" "https://<public-domain>/api/leads?since=2026-11-03&until=2026-11-03"   # 404
curl -s -o /dev/null -w "%{http_code}\n" "https://<public-domain>/leads"                                       # 404

# Public: the routes that must stay open
curl -s -o /dev/null -w "%{http_code}\n" "https://<public-domain>/creative/<ad-id>"                            # 200
curl -s -o /dev/null -w "%{http_code}\n" -X POST "https://<public-domain>/api/webhooks/lead-status" -d '{}'  # 401, not 404
```

Then open the admin domain with the authorized Vercel account: the dashboard should load without any app password.

## Local runs and tests

Local servers are closed unless started with `ECOM_ADMIN_ACCESS=vercel-protected`. See `tests/README.md` for the three servers
the browser suites use.
