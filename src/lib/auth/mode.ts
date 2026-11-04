/**
 * Whether the app's own team sign-in applies to this deployment.
 *
 * On a Vercel Preview it does not: Vercel Deployment Protection is the gate there, so the Preview opens directly.
 * Production, local runs and any other or unknown value keep the sign-in. Only the exact value "preview" turns it off.
 */
export function appSignInRequired(vercelEnv: string | undefined): boolean {
  return vercelEnv !== "preview";
}
