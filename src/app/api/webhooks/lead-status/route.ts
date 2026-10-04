import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { LeadStatusDatabaseError } from "@/lib/lead-status/db";
import { getLeadStatusRepository } from "@/lib/lead-status/repository";
import { validateStatusUpdate } from "@/lib/lead-status/validation";

// Never statically cached, Node runtime only - consistent with every other
// data route in this app.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

interface WebhookBody {
  leadId?: unknown;
  mainStatus?: unknown;
  secondaryStatus?: unknown;
  fullPaymentAmount?: unknown;
  partialPaymentAmount?: unknown;
}

type AmountParseResult = { ok: true; value: number | null | undefined } | { ok: false };

function parseOptionalAmount(value: unknown): AmountParseResult {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { ok: true, value: null };
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return { ok: true, value };
  return { ok: false };
}

/**
 * Make.com (or any external automation) calls this to upsert a lead's
 * Main/Secondary status by its Meta Lead ID - the same lead_status table and
 * validateStatusUpdate() business rules the dashboard's own /api/lead-status
 * route uses (never a second definition of the status hierarchy). Separate
 * endpoint + separate secret from /api/landing-leads on purpose: a leaked
 * Make scenario secret for ONE integration should never grant write access
 * to the other.
 *
 * upsert() means this also WORKS the first time a lead's status is set -
 * "updating the lead on creation" - with no prior row required: if the Meta
 * Lead ID doesn't exist in lead_status yet, this creates it.
 */
export async function POST(request: NextRequest) {
  const configuredSecret = process.env.LEAD_STATUS_WEBHOOK_SECRET?.trim();
  if (!configuredSecret) {
    return NextResponse.json(
      { error: { message: "נקודת הקצה אינה מוגדרת (LEAD_STATUS_WEBHOOK_SECRET חסר בצד השרת)." } },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const providedSecret = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  if (!providedSecret || !timingSafeStringEqual(providedSecret, configuredSecret)) {
    return NextResponse.json({ error: { message: "אימות נכשל." } }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = (await request.json()) as WebhookBody;
  } catch {
    return NextResponse.json({ error: { message: "גוף הבקשה אינו JSON תקין." } }, { status: 400 });
  }

  const { leadId, mainStatus, secondaryStatus } = body;
  if (typeof leadId !== "string" || !leadId) {
    return NextResponse.json({ error: { message: "leadId (מזהה ליד פייסבוק) חסר." } }, { status: 400 });
  }
  if (typeof mainStatus !== "string" || typeof secondaryStatus !== "string") {
    return NextResponse.json({ error: { message: "mainStatus / secondaryStatus חסרים." } }, { status: 400 });
  }

  const fullPaymentParsed = parseOptionalAmount(body.fullPaymentAmount);
  const partialPaymentParsed = parseOptionalAmount(body.partialPaymentAmount);
  if (!fullPaymentParsed.ok || !partialPaymentParsed.ok) {
    return NextResponse.json({ error: { message: "סכום תשלום אינו תקין - יש להזין מספר חיובי." } }, { status: 400 });
  }
  const fullPaymentAmount = fullPaymentParsed.value;
  const partialPaymentAmount = partialPaymentParsed.value;

  const repository = getLeadStatusRepository();

  let existing;
  try {
    existing = await repository.get(leadId);
  } catch (error) {
    const message = error instanceof LeadStatusDatabaseError ? error.message : "שגיאה לא צפויה בגישה למסד הנתונים.";
    return NextResponse.json({ error: { message } }, { status: 503 });
  }

  const validation = validateStatusUpdate({ mainStatus, secondaryStatus, fullPaymentAmount, partialPaymentAmount }, existing);
  if (!validation.ok) {
    return NextResponse.json({ error: { message: validation.error } }, { status: 400 });
  }

  try {
    const updated = await repository.upsert(leadId, {
      mainStatus,
      secondaryStatus,
      fullPaymentAmount,
      partialPaymentAmount,
    });
    return NextResponse.json({ ok: true, record: updated });
  } catch (error) {
    // Never log the request body - LeadStatusDatabaseError's message is
    // always a safe, hand-written Hebrew string (see db.ts), never the raw
    // driver error.
    const message = error instanceof LeadStatusDatabaseError ? error.message : "שגיאה לא צפויה בשמירת הסטטוס.";
    return NextResponse.json({ error: { message } }, { status: 503 });
  }
}
