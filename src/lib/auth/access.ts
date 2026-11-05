/**
 * Which requests reach the app where the private area is closed. Pure, so the allowlist is tested directly. Each entry is a
 * deliberate exception and says why. Everything else belongs to the private area.
 */

export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function isPublicRequest(pathname: string, method: string): boolean {
  // The creative page for sales reps. It shows ad copy and media only, never customer data (see creative-lookup).
  if (pathname.startsWith("/creative/")) return true;
  // Make's webhook. The route checks its own Bearer secret, and rejects anything else.
  if (pathname === "/api/webhooks/lead-status") return true;
  // Landing pages post new leads with a Bearer secret. The route checks it. Reading leads is part of the private area (GET).
  if (pathname === "/api/landing-leads" && method.toUpperCase() === "POST") return true;
  return false;
}
