/**
 * Whether the private area is open to a request: the dashboard pages, and every route that reads or changes lead data.
 *
 * The app has no sign-in of its own. Who may reach the private area is decided by the deployment, never by a password:
 *  - Vercel Preview: open. Vercel Deployment Protection covers every Preview deployment.
 *  - Any other run (production, local, unknown): closed, unless ECOM_ADMIN_ACCESS is exactly "vercel-protected". That value
 *    belongs only on the one deployment whose domain Vercel Deployment Protection covers. Where the private area is closed,
 *    its pages and APIs answer 404, as if they did not exist.
 * Pure, so the rule is tested directly.
 */
export const ADMIN_ACCESS_VALUE = "vercel-protected";

export interface AccessEnv {
  VERCEL_ENV?: string;
  ECOM_ADMIN_ACCESS?: string;
}

export function privateAreaOpen(env: AccessEnv): boolean {
  if (env.VERCEL_ENV === "preview") return true;
  return env.ECOM_ADMIN_ACCESS === ADMIN_ACCESS_VALUE;
}

/** The same rule, read from the running process. */
export function privateAreaOpenNow(): boolean {
  return privateAreaOpen({ VERCEL_ENV: process.env.VERCEL_ENV, ECOM_ADMIN_ACCESS: process.env.ECOM_ADMIN_ACCESS });
}
