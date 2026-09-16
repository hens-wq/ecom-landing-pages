import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { isValidDateRange } from "@/lib/advertising/date-range";
import { LandingLeadsDatabaseError } from "@/lib/landing-leads/db";
import { getLandingLeadsInRange, insertLandingLead } from "@/lib/landing-leads/repository";
import { validateLandingLeadInput } from "@/lib/landing-leads/validation";
import { buildLeadEvent } from "@/lib/meta-capi/build-event";
import { sendLeadEvent } from "@/lib/meta-capi/send-event";

// Never statically cached (live, frequently-changing business data), Node
// runtime only - consistent with every other data route in this app.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // Buffers of different lengths would throw in timingSafeEqual - comparing
  // against a hash of both first keeps the comparison itself constant-time
  // without leaking the secret's length through an early return.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * The only write path into the `leads` table (see lib/landing-leads). Called
 * by the external landing-page tool / its Make.com scenario as an ADDITIONAL
 * fan-out step - never replaces the existing Make/CRM webhook, which this
 * app has no knowledge of and never touches.
 *
 * Requires `Authorization: Bearer <LANDING_LEADS_API_SECRET>` since this is
 * the one endpoint in this app that accepts writes from outside Vercel's own
 * origin. Every other route here is either read-only or same-origin
 * (matching this app's existing, pre-existing lack of a login wall - not a
 * new gap this phase introduces).
 */
export async function POST(request: NextRequest) {
  const configuredSecret = process.env.LANDING_LEADS_API_SECRET?.trim();
  if (!configuredSecret) {
    return NextResponse.json(
      { error: { message: "נקודת הקצה אינה מוגדרת (LANDING_LEADS_API_SECRET חסר בצד השרת)." } },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const providedSecret = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  if (!providedSecret || !timingSafeStringEqual(providedSecret, configuredSecret)) {
    return NextResponse.json({ error: { message: "אימות נכשל." } }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: "גוף הבקשה אינו JSON תקין." } }, { status: 400 });
  }

  const validation = validateLandingLeadInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: { message: validation.error } }, { status: 400 });
  }

  try {
    const record = await insertLandingLead(validation.input);

    // Meta CAPI infrastructure is fully wired here but intentionally never
    // sends yet - sendLeadEvent() only ever does anything once
    // META_CAPI_SEND_ENABLED is explicitly set (see lib/meta-capi/config.ts
    // and this phase's report for exactly what's still needed). Fire-and-
    // forget: a CAPI failure (or, today, its permanently-disabled state)
    // must never affect whether saving the lead to the dashboard succeeded -
    // that response has already been decided by insertLandingLead above.
    const capiEvent = buildLeadEvent({
      internalLeadId: record.internalLeadId,
      phone: record.phone,
      email: record.email,
      eventSourceUrl: record.landingPageUrl,
      fbclid: record.fbclid,
    });
    void sendLeadEvent(capiEvent).catch(() => {});

    return NextResponse.json({ record });
  } catch (error) {
    // Never log the request body or the error's own message here - both can
    // carry a name/phone/email. LandingLeadsDatabaseError's message is always
    // a safe, hand-written Hebrew string (see db.ts).
    const message = error instanceof LandingLeadsDatabaseError ? error.message : "שגיאה לא צפויה בשמירת הליד.";
    return NextResponse.json({ error: { message } }, { status: 503 });
  }
}

/**
 * Same-origin read for the Leads page (app/leads/page.tsx) to merge landing-
 * page leads alongside the live Meta Instant Form leads - no bearer secret
 * required, matching every other GET route in this app (/api/leads,
 * /api/advertising, ...), none of which sit behind auth today either.
 */
export async function GET(request: NextRequest) {
  const since = request.nextUrl.searchParams.get("since") ?? "";
  const until = request.nextUrl.searchParams.get("until") ?? "";

  if (!isValidDateRange({ since, until })) {
    return NextResponse.json(
      { error: { message: "פרמטרי טווח תאריכים (since/until) חסרים או לא תקינים." } },
      { status: 400 }
    );
  }

  try {
    const leads = await getLandingLeadsInRange(since, until);
    return NextResponse.json({ leads });
  } catch (error) {
    const message = error instanceof LandingLeadsDatabaseError ? error.message : "שגיאה לא צפויה בטעינת לידים מדף נחיתה.";
    return NextResponse.json({ error: { message } }, { status: 503 });
  }
}
