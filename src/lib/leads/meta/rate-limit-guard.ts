import "server-only";

import { AdvertisingApiError } from "@/lib/advertising/types";

/**
 * In-memory, best-effort guard against calling Meta again immediately after
 * it has just rate-limited this leads pipeline - on top of (not instead of)
 * the unstable_cache layer in cache.ts, which only helps once a fetch has
 * actually succeeded. A rate-limited response never gets cached as data (it
 * isn't data), so without this guard, every request that lands while the
 * cache is still cold after a 429 would immediately try Meta again - exactly
 * the "changing the date range a few times in a row" burst that caused the
 * original bug.
 *
 * Scoped to this server process / warm serverless instance; not shared
 * across regions or cold starts. That's fine - it only needs to survive the
 * next handful of requests right after a real rate limit, not act as a
 * durable global lock.
 */
let cooldownUntilMs: number | null = null;
let cooldownMessage: string | null = null;

/** Used when Meta didn't tell us how long to wait (see meta/rate-limit.ts). */
const DEFAULT_COOLDOWN_MS = 60_000;

export function recordRateLimit(waitMinutes: number | null, message: string): void {
  const waitMs = waitMinutes && waitMinutes > 0 ? waitMinutes * 60_000 : DEFAULT_COOLDOWN_MS;
  cooldownUntilMs = Date.now() + waitMs;
  cooldownMessage = message;
}

/** Throws the same rate-limited error again (no network call) if still inside a cooldown window recorded by recordRateLimit. Clears the cooldown once it has passed. */
export function assertNotCoolingDown(): void {
  if (!cooldownUntilMs) return;

  if (Date.now() < cooldownUntilMs) {
    const remainingMinutes = Math.max(1, Math.ceil((cooldownUntilMs - Date.now()) / 60_000));
    throw new AdvertisingApiError(
      "rate_limited",
      cooldownMessage ?? `חריגה ממכסת הבקשות ל-Meta API. ניתן לנסות שוב בעוד כ-${remainingMinutes} דקות.`,
      "Skipped calling Meta - still inside the local post-rate-limit cooldown window.",
      remainingMinutes
    );
  }

  cooldownUntilMs = null;
  cooldownMessage = null;
}
