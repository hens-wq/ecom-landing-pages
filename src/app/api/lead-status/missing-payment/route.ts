import { NextResponse } from "next/server";

import { AdvertisingApiError, httpStatusForErrorCode } from "@/lib/advertising";
import { LandingLeadsDatabaseError } from "@/lib/landing-leads/db";
import { LeadStatusDatabaseError } from "@/lib/lead-status/db";
import { loadDashboardLeadIndex } from "@/lib/lead-status/dashboard-leads";
import type { MissingPaymentLead, MissingPaymentResponse } from "@/lib/lead-status/missing-payment";
import { getLeadStatusRepository } from "@/lib/lead-status/repository";
import { normalizeIsraeliPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Every enrolled lead (Main Status "נרשם") with no payment amount, across all
 * dates, oldest first. Drives the Leads page's red alert, so it's built from
 * the database and never from whatever date range the page is showing.
 *
 * A status row whose ID doesn't match any lead the dashboard knows is still
 * listed (found: false). Hiding it would hide a real unpaid enrollment.
 */
export async function GET() {
  try {
    const [records, index] = await Promise.all([getLeadStatusRepository().listEnrolledMissingPayment(), loadDashboardLeadIndex()]);

    const leads: MissingPaymentLead[] = records.map((record) => {
      const info = index.byId.get(record.leadId);
      const phone = normalizeIsraeliPhone(info?.normalizedPhone ?? info?.phone ?? record.normalizedPhone ?? "");
      return {
        leadId: record.leadId,
        name: info?.name ?? null,
        phone: phone || null,
        leadDate: info?.createdDate ?? null,
        found: Boolean(info),
      };
    });
    leads.sort((a, b) => (a.leadDate ?? "9999-12-31").localeCompare(b.leadDate ?? "9999-12-31"));

    const body: MissingPaymentResponse = { count: leads.length, leads, metaAvailable: index.metaAvailable };
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof AdvertisingApiError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: httpStatusForErrorCode(error.code) });
    }
    if (error instanceof LeadStatusDatabaseError || error instanceof LandingLeadsDatabaseError) {
      return NextResponse.json({ error: { message: error.message } }, { status: 503 });
    }
    return NextResponse.json({ error: { message: "שגיאה לא צפויה בטעינת הלידים שחסר להם תשלום." } }, { status: 500 });
  }
}
