import { NextResponse, type NextRequest } from "next/server";

import { getLeadStatusRepository } from "@/lib/lead-status/repository";
import { validateStatusUpdate } from "@/lib/lead-status/validation";

// Never statically cached (this is live, frequently-changing business data),
// Node runtime only - consistent with every other route in this app that
// touches server-only state.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const repository = getLeadStatusRepository();
  const records = await repository.getAll();
  return NextResponse.json({ records: Array.from(records.values()) });
}

interface UpsertBody {
  leadId?: unknown;
  phone?: unknown;
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

  const { leadId, mainStatus, secondaryStatus, phone } = body;
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
  const existing = await repository.get(leadId);

  const validation = validateStatusUpdate({ mainStatus, secondaryStatus, fullPaymentAmount, partialPaymentAmount }, existing);
  if (!validation.ok) {
    return NextResponse.json({ error: { message: validation.error } }, { status: 400 });
  }

  try {
    const updated = await repository.upsert(leadId, {
      mainStatus,
      secondaryStatus,
      phone: typeof phone === "string" ? phone : undefined,
      fullPaymentAmount,
      partialPaymentAmount,
    });
    return NextResponse.json({ record: updated });
  } catch {
    // Never log the request body here - it carries phone numbers and payment
    // amounts. A generic message is enough for the client.
    return NextResponse.json({ error: { message: "שגיאה לא צפויה בשמירת הסטטוס." } }, { status: 500 });
  }
}
