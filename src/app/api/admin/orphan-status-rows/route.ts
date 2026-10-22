import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { LandingLeadsDatabaseError } from "@/lib/landing-leads/db";
import { loadDashboardLeadIndex } from "@/lib/lead-status/dashboard-leads";
import { LeadStatusDatabaseError } from "@/lib/lead-status/db";
import { getLeadStatusRepository } from "@/lib/lead-status/repository";
import { classifyStatusRows, planOrphanDeletion } from "@/lib/lead-status/orphans";

// Temporary housekeeping route for the orphan status rows left by the old CRM
// webhook bug. Remove once the cleanup is confirmed.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CONFIRM_PHRASE = "DELETE_ORPHAN_STATUS_ROWS";
const MAX_IDS_PER_REQUEST = 500;

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Returns a response when the request must be refused, or null when it may proceed. */
function refuseUnlessAuthorized(request: NextRequest): NextResponse | null {
  const configuredSecret = process.env.LEAD_STATUS_ADMIN_SECRET?.trim();
  if (!configuredSecret) {
    return NextResponse.json({ error: { message: "נקודת הקצה אינה מוגדרת (LEAD_STATUS_ADMIN_SECRET חסר בצד השרת)." } }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization") ?? "";
  const providedSecret = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  if (!providedSecret || !timingSafeStringEqual(providedSecret, configuredSecret)) {
    return NextResponse.json({ error: { message: "אימות נכשל." } }, { status: 401 });
  }
  return null;
}

/**
 * Dry run. Lists orphan status rows by Meta Lead ID only - no names, phones or
 * amounts. Changes nothing.
 */
export async function GET(request: NextRequest) {
  const refusal = refuseUnlessAuthorized(request);
  if (refusal) return refusal;

  try {
    const index = await loadDashboardLeadIndex();
    if (!index.metaAvailable) {
      return NextResponse.json({ error: { message: "קריאת הלידים מ-Meta אינה זמינה - לא ניתן לאמת אילו רשומות יתומות." } }, { status: 503 });
    }
    const rows = await getLeadStatusRepository().listAllStatusRows();
    const classification = classifyStatusRows(rows, index.byId);

    return NextResponse.json({
      totalStatusRows: rows.length,
      realLeadCount: index.byId.size,
      matchedCount: classification.matched,
      orphanCount: classification.deletable.length,
      orphanLeadIds: classification.deletable,
      keptWithPaymentCount: classification.keptWithPayment.length,
      keptWithPaymentLeadIds: classification.keptWithPayment,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Deletes exactly the IDs passed in, and only those still orphans with no
 * payment at the moment of deletion. Anything else is reported back, not deleted.
 */
export async function POST(request: NextRequest) {
  const refusal = refuseUnlessAuthorized(request);
  if (refusal) return refusal;

  let body: { confirm?: unknown; leadIds?: unknown };
  try {
    body = (await request.json()) as { confirm?: unknown; leadIds?: unknown };
  } catch {
    return NextResponse.json({ error: { message: "גוף הבקשה אינו JSON תקין." } }, { status: 400 });
  }

  if (body.confirm !== CONFIRM_PHRASE) {
    return NextResponse.json({ error: { message: `נדרש אישור מפורש: confirm = "${CONFIRM_PHRASE}".` } }, { status: 400 });
  }
  if (
    !Array.isArray(body.leadIds) ||
    body.leadIds.length === 0 ||
    body.leadIds.length > MAX_IDS_PER_REQUEST ||
    !body.leadIds.every((id): id is string => typeof id === "string" && id.trim().length > 0)
  ) {
    return NextResponse.json({ error: { message: `leadIds חייב להיות מערך של 1-${MAX_IDS_PER_REQUEST} מזהים (מחרוזות).` } }, { status: 400 });
  }

  try {
    const index = await loadDashboardLeadIndex();
    if (!index.metaAvailable) {
      return NextResponse.json({ error: { message: "קריאת הלידים מ-Meta אינה זמינה - לא בוצעה מחיקה." } }, { status: 503 });
    }

    const repository = getLeadStatusRepository();
    const rowsBefore = await repository.listAllStatusRows();
    const classificationBefore = classifyStatusRows(rowsBefore, index.byId);
    const plan = planOrphanDeletion(body.leadIds.map((id) => id.trim()), classificationBefore);

    const deleted = await repository.deleteUnpaidStatusRows(plan.toDelete);

    const rowsAfter = await repository.listAllStatusRows();
    const classificationAfter = classifyStatusRows(rowsAfter, index.byId);

    return NextResponse.json({
      requested: new Set(body.leadIds.map((id) => id.trim())).size,
      deletedCount: deleted.length,
      deletedLeadIds: deleted,
      skipped: plan.skipped,
      remainingOrphanCount: classificationAfter.deletable.length,
      remainingKeptWithPaymentCount: classificationAfter.keptWithPayment.length,
      totalStatusRowsAfter: rowsAfter.length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof LeadStatusDatabaseError || error instanceof LandingLeadsDatabaseError) {
    return NextResponse.json({ error: { message: error.message } }, { status: 503 });
  }
  return NextResponse.json({ error: { message: "שגיאה לא צפויה בעיבוד רשומות היתומות." } }, { status: 500 });
}
