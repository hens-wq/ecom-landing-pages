/**
 * Slows down password guessing on the sign-in endpoint. It counts failed attempts per client address, in memory. On a serverless
 * platform each instance keeps its own count, so this is a brake on guessing, not a guarantee. The password is long for that reason.
 */

export const SIGN_IN_WINDOW_MS = 15 * 60 * 1000;
export const SIGN_IN_MAX_FAILURES = 20;

const failures = new Map<string, number[]>();

function recent(key: string, now: number): number[] {
  const kept = (failures.get(key) ?? []).filter((time) => now - time < SIGN_IN_WINDOW_MS);
  if (kept.length > 0) failures.set(key, kept);
  else failures.delete(key);
  return kept;
}

export function signInBlocked(key: string, now: number = Date.now()): boolean {
  return recent(key, now).length >= SIGN_IN_MAX_FAILURES;
}

export function recordFailedSignIn(key: string, now: number = Date.now()): void {
  failures.set(key, [...recent(key, now), now]);
}

/** The first address in X-Forwarded-For, which the platform sets. Anything without one shares a single bucket. */
export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
