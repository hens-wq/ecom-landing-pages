import { isoDateInTimezone } from "@/lib/advertising/timezone";
import { isExcludedCampaignId } from "@/lib/campaign-scope";
import type { DateRange } from "@/lib/advertising/types";
import type { LandingLeadRecord } from "@/lib/landing-leads/types";
import { metaIdOrNull } from "@/lib/landing-leads/validation";
import { defaultLeadStatusRecord, type LeadStatusRecord } from "@/lib/lead-status/types";
import type { MetaFormLead } from "@/lib/leads/types";
import type { LeadFact, LeadFactsResult, SourceState } from "@/lib/performance/types";

/** A lead source's own failure, carrying a message that is safe to show to users. Any other error is reported with a generic message. */
export class LeadSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadSourceError";
  }
}

export interface LeadFactsSources {
  readMetaLeads(range: DateRange): Promise<MetaFormLead[]>;
  readLandingLeads(range: DateRange): Promise<LandingLeadRecord[]>;
  readStatuses(leadIds: string[]): Promise<Map<string, LeadStatusRecord>>;
}

/** Status lookups go out in batches. There is never one query per lead. */
const STATUS_BATCH_SIZE = 500;

function describeFailure(error: unknown, fallback: string): string {
  return error instanceof LeadSourceError ? error.message : fallback;
}

/** An empty string when the timestamp is unusable. Such a lead is still counted, just without a date. */
function reportingDate(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp);
  return Number.isNaN(parsed.getTime()) ? "" : isoDateInTimezone(parsed);
}

/**
 * The campaign a landing lead carries, by ID only: its own campaign_id, or else a numeric campaign ID that was sent as
 * utm_campaign (a common Meta URL setup). A name in utm_campaign is never used. Whether the ID belongs to a listed
 * campaign is decided later, by attributeLeadFacts.
 */
export function landingCampaignId(record: LandingLeadRecord): string | null {
  return record.campaignId || metaIdOrNull(record.utmCampaign);
}

function metaFact(lead: MetaFormLead): LeadFact {
  return {
    id: lead.id,
    sourceType: lead.sourceType,
    leadDate: reportingDate(lead.createdTime),
    campaignId: lead.campaignId || null,
    adSetId: lead.adSetId || null,
    adId: lead.adId || null,
    statusKnown: false,
    mainStatus: null,
    secondaryStatus: null,
    fullPaymentAmount: null,
    partialPaymentAmount: null,
  };
}

function landingFact(record: LandingLeadRecord): LeadFact {
  return {
    id: record.internalLeadId,
    sourceType: "landing_page",
    leadDate: reportingDate(record.submittedAt),
    campaignId: landingCampaignId(record),
    adSetId: record.adSetId || null,
    adId: record.adId || null,
    statusKnown: false,
    mainStatus: null,
    secondaryStatus: null,
    fullPaymentAmount: null,
    partialPaymentAmount: null,
  };
}

/**
 * Loads every lead for the range and attaches its current status. A failing source
 * is reported in `sources` and never turns into an empty list: the caller can then
 * show "unknown" instead of 0. Never throws.
 */
export async function loadLeadFacts(range: DateRange, sources: LeadFactsSources): Promise<LeadFactsResult> {
  const [metaOutcome, landingOutcome] = await Promise.allSettled([
    sources.readMetaLeads(range),
    sources.readLandingLeads(range),
  ]);

  const facts = new Map<string, LeadFact>();
  const meta: LeadFactsResult["sources"]["meta"] = { state: "ok", message: null };
  if (metaOutcome.status === "fulfilled") {
    // Leads from excluded (non-course) campaigns are left out of every figure. Their records are not touched.
    for (const lead of metaOutcome.value) {
      if (!isExcludedCampaignId(lead.campaignId)) facts.set(lead.id, metaFact(lead));
    }
  } else {
    meta.state = "unavailable";
    meta.message = describeFailure(metaOutcome.reason, "לא ניתן לטעון לידים מ-Meta כרגע.");
  }

  const landing: LeadFactsResult["sources"]["landing"] = { state: "ok", message: null };
  if (landingOutcome.status === "fulfilled") {
    for (const record of landingOutcome.value) {
      if (!isExcludedCampaignId(landingCampaignId(record))) facts.set(record.internalLeadId, landingFact(record));
    }
  } else {
    landing.state = "unavailable";
    landing.message = describeFailure(landingOutcome.reason, "לא ניתן לטעון לידים מדפי הנחיתה כרגע.");
  }

  const ids = Array.from(facts.keys());
  const statusRecords = new Map<string, LeadStatusRecord>();
  const knownIds = new Set<string>();
  let failedBatches = 0;
  let statusFailure: unknown = null;
  for (let start = 0; start < ids.length; start += STATUS_BATCH_SIZE) {
    const batch = ids.slice(start, start + STATUS_BATCH_SIZE);
    try {
      const records = await sources.readStatuses(batch);
      for (const id of batch) knownIds.add(id);
      for (const [id, record] of records) statusRecords.set(id, record);
    } catch (error) {
      failedBatches += 1;
      statusFailure = error;
    }
  }

  const leads = Array.from(facts.values()).map((fact): LeadFact => {
    if (!knownIds.has(fact.id)) return fact;
    // A lead with no saved status yet is "חדש" by default - a known state, not an unknown one.
    const record = statusRecords.get(fact.id) ?? defaultLeadStatusRecord(fact.id, null);
    return {
      ...fact,
      statusKnown: true,
      mainStatus: record.mainStatus,
      secondaryStatus: record.secondaryStatus,
      fullPaymentAmount: record.fullPaymentAmount,
      partialPaymentAmount: record.partialPaymentAmount,
    };
  });

  const statusState: SourceState =
    failedBatches === 0 ? "ok" : knownIds.size === 0 ? "unavailable" : "partial";

  return {
    since: range.since,
    until: range.until,
    leads,
    sources: {
      meta,
      landing,
      statuses: {
        state: statusState,
        unknownCount: ids.length - knownIds.size,
        message:
          failedBatches === 0 ? null : describeFailure(statusFailure, "לא ניתן לטעון סטטוסי לידים ממסד הנתונים כרגע."),
      },
    },
  };
}
