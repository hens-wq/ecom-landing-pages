import { NextResponse, type NextRequest } from "next/server";

import { LeadStatusDatabaseError } from "@/lib/lead-status/db";
import { getLeadStatusRepository } from "@/lib/lead-status/repository";
import { validateStatusUpdate } from "@/lib/lead-status/validation";

// Never statically cached (this is live, frequently-changing business data),
// Node runtime only - consistent with every other route in this app that
// touches server-only state.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface UpsertBody {
  leadId?: unknown;
  normalizedPhone?: unknown;
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

export async function POST(request: NextRequest) {
  let body: UpsertBody;
  try {
    body = (await request.json()) as UpsertBody;
  } catch {
    return NextResponse.json({ error: { message: "גוף הבקשה אינו JSON תקין." } }, { status: 400 });
  }

  const { leadId, mainStatus, secondaryStatus, normalizedPhone } = body;
  if (typeof leadId !== "string" || !leadId) {
    return NextResponse.json({ error: { message: "leadId חסר." } }, { status: 400 });
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
      normalizedPhone: typeof normalizedPhone === "string" ? normalizedPhone : undefined,
      fullPaymentAmount,
      partialPaymentAmount,
    });
    return NextResponse.json({ record: updated });
  } catch (error) {
    // Never log the request body here - it carries phone numbers and payment
    // amounts. LeadStatusDatabaseError's own message is always a safe,
    // hand-written Hebrew string (see db.ts) - never the raw driver error,
    // which could in rare cases echo connection details.
    const message = error instanceof LeadStatusDatabaseError ? error.message : "שגיאה לא צפויה בשמירת הסטטוס.";
    return NextResponse.json({ error: { message } }, { status: 503 });
  }
}
