import type { LeadFormValues, LeadSubmissionResult, TrackingContext } from "@/lib/types";

declare global {
  interface Window {
    /**
     * Set by public/lead-config.js — a plain file, not part of the JS
     * bundle, so the destination can be changed directly on the static
     * host later with no rebuild. Empty until a real endpoint exists.
     */
    LEAD_SUBMIT_URL?: string;
  }
}

/**
 * Static-export builds (STATIC_EXPORT=1, see next.config.ts /
 * scripts/build-static.sh) have no /api/lead — there is no Node.js
 * runtime on that host to run it. Until a real endpoint is configured
 * (window.LEAD_SUBMIT_URL via public/lead-config.js), submissions fail
 * honestly rather than pretending to succeed.
 */
async function submitLeadStatic(
  values: LeadFormValues,
  tracking: TrackingContext,
): Promise<LeadSubmissionResult> {
  const endpoint = typeof window !== "undefined" ? window.LEAD_SUBMIT_URL : undefined;

  if (!endpoint) {
    return {
      ok: false,
      error: "טופס זה עדיין לא מחובר ליעד שליחה. אנא צרו קשר בטלפון בינתיים.",
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, ...tracking }),
    });

    if (!response.ok) {
      return { ok: false, error: "אירעה שגיאה בשליחת הפרטים" };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "בעיית תקשורת. נסו שוב." };
  }
}

/**
 * Normal (Node.js/Vercel) builds: the browser always talks to our own
 * /api/lead route, never to the CRM flow directly — that keeps the
 * eventual webhook URL and any credentials server-side only, and means
 * the destination (Google Sheets, Make, Fireberry, or all three) can
 * change later purely via env vars, with no change to any landing page
 * component.
 */
async function submitLeadServer(
  values: LeadFormValues,
  tracking: TrackingContext,
): Promise<LeadSubmissionResult> {
  try {
    const response = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, ...tracking }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      return { ok: false, error: body?.error ?? "אירעה שגיאה בשליחת הפרטים" };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "בעיית תקשורת. נסו שוב." };
  }
}

/** Single client-side entry point for sending a lead, from any form on any page. */
export async function submitLead(
  values: LeadFormValues,
  tracking: TrackingContext,
): Promise<LeadSubmissionResult> {
  if (process.env.NEXT_PUBLIC_STATIC_EXPORT === "1") {
    return submitLeadStatic(values, tracking);
  }
  return submitLeadServer(values, tracking);
}
