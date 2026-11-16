/**
 * Timing and retry rules for CRM events. Pure.
 */

/** Attempts per event before it is marked failed for good. */
export const CRM_MAX_ATTEMPTS = 6;

/** Wait after each failed attempt: 1 min, 5 min, 30 min, 2 h, 6 h. */
const RETRY_DELAYS_SECONDS = [60, 300, 1800, 7200, 21600];

/**
 * Seconds to wait after `failedAttempts` failed attempts, or null when no
 * attempts are left. Attempts count every claim made, including the failed one.
 */
export function retryDelaySeconds(failedAttempts: number): number | null {
  if (failedAttempts >= CRM_MAX_ATTEMPTS) return null;
  const index = Math.min(Math.max(failedAttempts - 1, 0), RETRY_DELAYS_SECONDS.length - 1);
  return RETRY_DELAYS_SECONDS[index] ?? null;
}

/**
 * Meta's event_time window for these events is NOT verified against Meta's
 * documentation yet. Seven days is the conservative bound: an older event is
 * skipped and never sent, so no historical customer data goes out by accident.
 */
export const CRM_MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** How long a claimed row is held before another worker may take it over. */
export const CRM_CLAIM_LEASE_SECONDS = 300;

export function isTooOld(eventTime: Date, now: Date): boolean {
  return now.getTime() - eventTime.getTime() > CRM_MAX_EVENT_AGE_MS;
}
