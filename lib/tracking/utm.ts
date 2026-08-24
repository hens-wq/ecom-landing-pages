import type { UtmParams } from "@/lib/types";

const STORAGE_KEY = "ecom_lp_tracking";

const TRACKED_PARAM_KEYS: (keyof UtmParams)[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
];

const EMPTY_UTM: UtmParams = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
  fbclid: null,
  gclid: null,
};

function readStoredParams(): Partial<UtmParams> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<UtmParams>) : {};
  } catch {
    return {};
  }
}

function writeStoredParams(params: Partial<UtmParams>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  } catch {
    // sessionStorage unavailable (private mode / disabled) — tracking is
    // best-effort, so fail silently rather than break the page.
  }
}

/**
 * Captures UTM / click-id params from the current URL on first touch, then
 * persists them across the visit (sessionStorage) so a user who lands on
 * an ad, browses a couple of pages, and submits later still carries the
 * original attribution — the params don't need to be present on every URL.
 */
export function captureAndPersistUtmParams(): UtmParams {
  const stored = readStoredParams();

  if (typeof window === "undefined") {
    return { ...EMPTY_UTM, ...stored };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const merged: Partial<UtmParams> = { ...stored };

  let hasNewValue = false;
  for (const key of TRACKED_PARAM_KEYS) {
    const value = searchParams.get(key);
    if (value) {
      merged[key] = value;
      hasNewValue = true;
    }
  }

  if (hasNewValue) {
    writeStoredParams(merged);
  }

  return { ...EMPTY_UTM, ...merged };
}

export function getPersistedUtmParams(): UtmParams {
  return { ...EMPTY_UTM, ...readStoredParams() };
}
