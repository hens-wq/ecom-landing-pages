/**
 * Which requests reach the app without the team's session. Everything else needs a valid session cookie. Pure, so the allowlist
 * is tested directly. Each entry below is a deliberate exception and says why.
 */

export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function isPublicRequest(pathname: string, method: string): boolean {
  // The sign-in page and its own endpoints: login, logout and the session status (which reveals nothing but yes/no).
  if (pathname === "/login") return true;
  if (pathname.startsWith("/api/auth/")) return true;
  // The creative page for sales reps. It shows ad copy and media only, never customer data (see creative-lookup).
  if (pathname.startsWith("/creative/")) return true;
  // Make's webhook. The route checks its own Bearer secret, and rejects anything else.
  if (pathname === "/api/webhooks/lead-status") return true;
  // Landing pages post new leads with a Bearer secret. The route checks it. Reading leads still needs a session (GET below).
  if (pathname === "/api/landing-leads" && method.toUpperCase() === "POST") return true;
  return false;
}
