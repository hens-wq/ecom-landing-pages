import { NextResponse, type NextRequest } from "next/server";

import { AdvertisingApiError, httpStatusForErrorCode } from "@/lib/advertising";
import { isoDateInTimezone } from "@/lib/advertising/timezone";
import { LandingLeadsDatabaseError } from "@/lib/landing-leads/db";
import { getLandingLeadsInRange } from "@/lib/landing-leads/repository";
import { LeadStatusDatabaseError } from "@/lib/lead-status/db";
import { getLeadStatusRepository } from "@/lib/lead-status/repository";
import { getLeadsData } from "@/lib/leads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Early enough to reach any lead this dashboard has ever stored. */
const ALL_TIME_SINCE = "2010-01-01";

/**
 * Enrolled leads (Main Status "נרשם") with no payment amount, across all dates.
 *
 * Without ?details=1 this is one database read, used for the Leads page
 * banner's count. With ?details=1 it also returns the earliest and latest
 * creation dates of those leads, so the page can widen its date range just
 * far enough to show them.
 */
export async function GET(request: NextRequest) {
  const withDetails = request.nextUrl.searchParams.get("details") === "1";

  try {
    const records = await getLeadStatusRepository().listEnrolledMissingPayment();
    const leadIds = new Set(records.map((record) => record.leadId));

    if (!withDetails || leadIds.size === 0) {
      return NextResponse.json({ count: leadIds.size, earliestDate: null, latestDate: null });
    }

    const dates = await findCreationDates(leadIds);
    return NextResponse.json({ count: leadIds.size, ...dates });
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

async function findCreationDates(wantedIds: Set<string>): Promise<{ earliestDate: string | null; latestDate: string | null }> {
  const today = isoDateInTimezone(new Date());
  const [metaLeads, landingLeads] = await Promise.all([
    getLeadsData({ since: ALL_TIME_SINCE, until: today }),
    getLandingLeadsInRange(ALL_TIME_SINCE, today),
  ]);

  const times: number[] = [];
  for (const lead of metaLeads.leads) {
    if (wantedIds.has(lead.id)) times.push(new Date(lead.createdTime).getTime());
  }
  for (const record of landingLeads) {
    if (wantedIds.has(record.internalLeadId)) times.push(new Date(record.submittedAt).getTime());
  }

  if (times.length === 0) return { earliestDate: null, latestDate: null };
  return {
    earliestDate: isoDateInTimezone(new Date(Math.min(...times))),
    latestDate: isoDateInTimezone(new Date(Math.max(...times))),
  };
}
