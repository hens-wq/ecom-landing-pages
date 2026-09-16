import { NextResponse, type NextRequest } from "next/server";

import { LeadStatusDatabaseError } from "@/lib/lead-status/db";
import { getLeadStatusRepository } from "@/lib/lead-status/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Batch-loads statuses for however many lead IDs the Leads page currently
 * has loaded (the whole date range's worth, not just what's scrolled into
 * view) - one query instead of one per row, avoiding N+1. POST (not GET)
 * since the ID list can be large enough to risk a URL length limit.
 */
export async function POST(request: NextRequest) {
  let body: { leadIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: "גוף הבקשה אינו JSON תקין." } }, { status: 400 });
  }

  if (!Array.isArray(body.leadIds) || !body.leadIds.every((id): id is string => typeof id === "string")) {
    return NextResponse.json({ error: { message: "leadIds חייב להיות מערך של מזהי לידים." } }, { status: 400 });
  }

  try {
    const repository = getLeadStatusRepository();
    const records = await repository.getMany(body.leadIds);
    return NextResponse.json({ records: Array.from(records.values()) });
  } catch (error) {
    const message = error instanceof LeadStatusDatabaseError ? error.message : "שגיאה לא צפויה בטעינת סטטוסי הלידים.";
    return NextResponse.json({ error: { message } }, { status: 503 });
  }
}
