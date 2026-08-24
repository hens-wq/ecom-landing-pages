import type { LeadFormValues, LeadSubmissionResult, TrackingContext } from "@/lib/types";

/**
 * Single client-side entry point for sending a lead.
 *
 * The browser always talks to our own /api/lead route, never to the CRM
 * flow directly — that keeps the eventual webhook URL and any credentials
 * server-side only, and means the destination (Google Sheets, Make,
 * Fireberry, or all three) can change later purely via env vars, with no
 * change to any landing page component.
 */
export async function submitLead(
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
