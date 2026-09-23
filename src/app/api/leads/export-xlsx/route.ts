import { NextResponse, type NextRequest } from "next/server";

import { buildPerformanceTree } from "@/lib/aggregate";
import { AdvertisingApiError, getAdvertisingData, httpStatusForErrorCode, type AdvertisingResult } from "@/lib/advertising";
import { isValidDateRange } from "@/lib/advertising/date-range";
import { buildNameLookup, landingLeadToMetaFormLead } from "@/lib/landing-leads/merge";
import { LandingLeadsDatabaseError } from "@/lib/landing-leads/db";
import { getLandingLeadsInRange } from "@/lib/landing-leads/repository";
import { LeadStatusDatabaseError } from "@/lib/lead-status/db";
import { getLeadStatusRepository } from "@/lib/lead-status/repository";
import { getLeadsData } from "@/lib/leads";
import { buildLeadExportXlsxBuffer, buildLeadExportXlsxFilename } from "@/lib/leads/export-xlsx";
import { toLeadExportRow } from "@/lib/leads/export";

// Never statically cached, Node runtime only (write-excel-file + Buffer
// output, same as every other data route in this app).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The general-purpose "ייצוא לפי טווח נבחר" export: same 10-column contract
 * as the 7-day Agent CSV export (lib/leads/export.ts), same merge of Meta
 * Instant Form leads + Neon landing-page leads + their lead_status rows as
 * the Leads page's own fetchCombinedLeads (app/leads/page.tsx) - just done
 * server-side, in-process, for whatever since/until the client passes (the
 * page's own currently-selected date range, never a fixed window), and
 * serialized to a real .xlsx buffer instead of JSON. Deliberately does NOT
 * apply any of the page's other filters (campaign/status/search) - the
 * selected date range is the only export scope, matching the existing
 * 7-day export's own unfiltered-by-other-filters behavior.
 */
export async function GET(request: NextRequest) {
  const since = request.nextUrl.searchParams.get("since") ?? "";
  const until = request.nextUrl.searchParams.get("until") ?? "";

  if (!isValidDateRange({ since, until })) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "פרמטרי טווח תאריכים (since/until) חסרים או לא תקינים." } },
      { status: 400 }
    );
  }

  try {
    const [leadsResult, advertisingResult, landingLeads] = await Promise.all([
      getLeadsData({ since, until }),
      getAdvertisingData({ since, until }),
      getLandingLeadsInRange(since, until),
    ]);

    const campaignRows = buildPerformanceTree((advertisingResult as AdvertisingResult).campaigns);
    const nameLookup = buildNameLookup(campaignRows);
    const allLeads = [
      ...leadsResult.leads,
      ...landingLeads.map((record) => landingLeadToMetaFormLead(record, nameLookup)),
    ];

    const repository = getLeadStatusRepository();
    const statusesByLeadId = await repository.getMany(allLeads.map((lead) => lead.id));

    const rows = allLeads.map((lead) => toLeadExportRow(lead, statusesByLeadId.get(lead.id)));
    const buffer = await buildLeadExportXlsxBuffer(rows);
    const filename = buildLeadExportXlsxFilename(since, until);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AdvertisingApiError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: httpStatusForErrorCode(error.code) });
    }
    if (error instanceof LandingLeadsDatabaseError || error instanceof LeadStatusDatabaseError) {
      return NextResponse.json({ error: { code: "unknown_error", message: error.message } }, { status: 503 });
    }
    return NextResponse.json(
      { error: { code: "unknown_error", message: "שגיאה לא צפויה בהפקת קובץ הייצוא." } },
      { status: 500 }
    );
  }
}
