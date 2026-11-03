/**
 * Demo (mock) data is served only when ECOM_DEMO_DATA=1 is set on purpose, for local tests and isolated sandboxes.
 * Anywhere else, a missing or broken Meta connection is an error the UI shows. The app never switches to demo numbers
 * on its own, and it never exports them as if they were real.
 */
export const DEMO_DATA_ENV_VAR = "ECOM_DEMO_DATA";

export function demoDataEnabled(): boolean {
  return process.env[DEMO_DATA_ENV_VAR] === "1";
}

/** Shown by every Meta-backed source when no connection is configured and demo data is off. It names variables, never their values. */
export const META_NOT_CONFIGURED_MESSAGE =
  "חיבור Meta Ads לא מוגדר: חסרים משתני הסביבה META_ACCESS_TOKEN ו-META_AD_ACCOUNT_ID. לא מוצגים נתוני דמו במערכת חיה.";
