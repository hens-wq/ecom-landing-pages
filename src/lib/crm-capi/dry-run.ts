/**
 * Read-only CRM dry run: classifies the dashboard's leads against the CRM rules and the outbox, and
 * builds the report. Pure. The loader (dry-run-loader.ts) reads the data and passes it in, so nothing
 * here sends to Meta or writes to the database.
 *
 * Progression dates. The dashboard keeps each lead's current status and the time of its last write
 * (lead_status.updated_at), but no history. The outbox keeps the time each qualifying change was
 * recorded (event_time), from 17.11.2026 on, and that is the only verified date. updated_at is an upper
 * bound: the change happened no later than the last write. So an old updated_at proves the change is
 * too old; a recent one leaves the date unknown, and the lead is not sent. The current date is never
 * used in place of either.
 */
import { EXCLUDED_CAMPAIGNS, isRecruitmentCampaignName } from "@/lib/campaign-scope";
import { META_LEAD_ID_PATTERN } from "@/lib/crm-capi/event";
import { CRM_MAX_EVENT_AGE_MS } from "@/lib/crm-capi/policy";
import { isQualified, isRegistered, type CrmEventType, type LeadQualitySnapshot } from "@/lib/crm-capi/rules";

/**
 * When the CRM dataset switch went live: the ready time of production deployment dpl_69dx (commit
 * 219bdc9), the first one to read META_CRM_DATASET_ID. Events sent at or after it went to the CRM
 * dataset; earlier ones were sent under the old configuration. Read from Vercel: READY at 1794929254687.
 */
export const CRM_DATASET_SWITCHED_AT = new Date(1794929254687);

export type CrmOutboxStatus = "pending" | "sending" | "retry" | "sent" | "failed" | "skipped";

/** Where one qualifying event stands. Each lead and event type falls into exactly one bucket. */
export type EventBucket =
  | "alreadySentToCrm"
  | "sentBeforeSwitch"
  | "excluded"
  | "missingMetaLeadId"
  | "tooOld"
  | "missingReliableDate"
  | "failedOrSkipped"
  | "sendable";

export type BucketCounts = Record<EventBucket, number>;

export type ExclusionReason = "verified_campaign_id" | "recruitment_name" | "attribution_uncertain";

export interface DryRunLead {
  /** The dashboard lead ID the status is stored under: the Meta Lead ID, or the internal ID of a landing lead. */
  leadKey: string;
  /** False when no Meta or landing record carries this ID, so the attribution is unknown. */
  hasLeadRecord: boolean;
  campaignId: string | null;
  campaignName: string | null;
  /** Meta Lead ID stored on a landing lead's record. Not used for sending: the CRM keys landing leads by their internal ID. */
  landingMetaLeadId: string | null;
  /** The current status. Null when no status row exists; the implicit default never qualifies. */
  status: LeadQualitySnapshot | null;
  /** lead_status.updated_at: the time of the last write. An upper bound on when the current status began. */
  statusUpdatedAt: Date | null;
}

export interface DryRunOutboxRow {
  leadKey: string;
  eventType: CrmEventType;
  status: CrmOutboxStatus;
  eventTime: Date;
  sentAt: Date | null;
  lastError: string | null;
}

export interface DryRunConfigFlags {
  /** True only when META_CAPI_CRM_SEND_ENABLED is "true" and the CRM dataset and token are both set. */
  sendingEnabled: boolean;
  crmDatasetConfigured: boolean;
  crmTokenConfigured: boolean;
}

export interface DryRunInput {
  now: Date;
  switchAt: Date;
  leads: DryRunLead[];
  outbox: DryRunOutboxRow[];
  config: DryRunConfigFlags;
}

export type DryRunLoadResult =
  | { ok: true; leads: DryRunLead[]; outbox: DryRunOutboxRow[] }
  | { ok: false; reason: "meta_unavailable" | "database_unavailable" };

export interface MetaLeadInput {
  id: string;
  campaignId: string;
  campaignName: string;
}

export interface LandingLeadInput {
  internalLeadId: string;
  campaignId: string | null;
  metaLeadId: string | null;
}

export interface StatusRowInput {
  leadId: string;
  mainStatus: string;
  secondaryStatus: string;
  studentRating: number | null;
  updatedAt: string;
}

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * One entry per lead: the Meta leads and the landing leads, as the dashboard index has them, then the
 * status rows. A landing lead takes the campaign name of any Meta lead with the same campaign ID, so the
 * name rule applies to it too. A status row with no lead record is kept, with its attribution unknown.
 */
export function mergeDryRunLeads(input: { meta: MetaLeadInput[]; landing: LandingLeadInput[]; statusRows: StatusRowInput[] }): DryRunLead[] {
  const campaignNameById = new Map<string, string>();
  for (const lead of input.meta) {
    const campaignId = nonEmpty(lead.campaignId);
    const campaignName = nonEmpty(lead.campaignName);
    if (campaignId && campaignName && !campaignNameById.has(campaignId)) campaignNameById.set(campaignId, campaignName);
  }

  const byKey = new Map<string, DryRunLead>();
  for (const lead of input.meta) {
    byKey.set(lead.id, {
      leadKey: lead.id,
      hasLeadRecord: true,
      campaignId: nonEmpty(lead.campaignId),
      campaignName: nonEmpty(lead.campaignName),
      landingMetaLeadId: null,
      status: null,
      statusUpdatedAt: null,
    });
  }
  for (const record of input.landing) {
    const campaignId = nonEmpty(record.campaignId);
    byKey.set(record.internalLeadId, {
      leadKey: record.internalLeadId,
      hasLeadRecord: true,
      campaignId,
      campaignName: campaignId === null ? null : (campaignNameById.get(campaignId) ?? null),
      landingMetaLeadId: nonEmpty(record.metaLeadId),
      status: null,
      statusUpdatedAt: null,
    });
  }
  for (const row of input.statusRows) {
    const existing: DryRunLead = byKey.get(row.leadId) ?? {
      leadKey: row.leadId,
      hasLeadRecord: false,
      campaignId: null,
      campaignName: null,
      landingMetaLeadId: null,
      status: null,
      statusUpdatedAt: null,
    };
    byKey.set(row.leadId, {
      ...existing,
      status: { mainStatus: row.mainStatus, secondaryStatus: row.secondaryStatus, studentRating: row.studentRating },
      statusUpdatedAt: new Date(row.updatedAt),
    });
  }
  return [...byKey.values()];
}

const VERIFIED_CAMPAIGN_IDS: ReadonlySet<string> = new Set(EXCLUDED_CAMPAIGNS.map((campaign) => campaign.id));

/**
 * Why a lead is kept out of sending, or null. A verified campaign ID and an explicit recruitment name
 * both exclude. A lead whose campaign is unknown is excluded too: its attribution is uncertain.
 */
export function exclusionFor(lead: DryRunLead): ExclusionReason | null {
  if (!lead.hasLeadRecord) return "attribution_uncertain";
  if (lead.campaignId !== null && VERIFIED_CAMPAIGN_IDS.has(lead.campaignId)) return "verified_campaign_id";
  if (isRecruitmentCampaignName(lead.campaignName)) return "recruitment_name";
  if (lead.campaignId === null) return "attribution_uncertain";
  return null;
}

export interface EventClassificationInput {
  leadKey: string;
  exclusion: ExclusionReason | null;
  row: DryRunOutboxRow | undefined;
  statusUpdatedAt: Date | null;
  now: Date;
  switchAt: Date;
}

/**
 * The state of one event. What is already known comes first: a row sent to Meta is reported as sent and
 * is never sendable again. Then exclusion, then the Meta Lead ID. The date comes only from the outbox
 * row, or from an old last write, which proves the change is too old.
 */
export function classifyEvent(input: EventClassificationInput): EventBucket {
  const { row, now, switchAt } = input;
  if (row?.status === "sent") {
    const toCrmDataset = row.sentAt === null || row.sentAt.getTime() >= switchAt.getTime();
    return toCrmDataset ? "alreadySentToCrm" : "sentBeforeSwitch";
  }
  if (input.exclusion !== null) return "excluded";
  if (!META_LEAD_ID_PATTERN.test(input.leadKey)) return "missingMetaLeadId";

  const windowStart = now.getTime() - CRM_MAX_EVENT_AGE_MS;
  if (row) {
    if (row.status === "skipped" && row.lastError === "event_too_old") return "tooOld";
    if (row.status === "failed" || row.status === "skipped") return "failedOrSkipped";
    // Pending, retry or sending: the next flush sends it, so its own verified time decides.
    return row.eventTime.getTime() < windowStart ? "tooOld" : "sendable";
  }
  if (input.statusUpdatedAt !== null && input.statusUpdatedAt.getTime() < windowStart) return "tooOld";
  return "missingReliableDate";
}

export interface DryRunReport {
  mode: "dry_run";
  generatedAt: string;
  window: { from: string; to: string; days: number };
  datasetSwitchedAt: string;
  config: DryRunConfigFlags;
  scanned: { dashboardLeads: number; statusRows: number; outboxRows: number; orphanStatusRows: number };
  qualifyingLeads: { total: number; withVerifiedDateInWindow: number; buckets: BucketCounts };
  registeredLeads: { total: number; buckets: BucketCounts };
  outbox: {
    sentToCrmDataset: number;
    sentBeforeSwitch: number;
    queued: number;
    failed: number;
    skippedEventTooOld: number;
    skippedInvalidMetaLeadId: number;
    skippedOther: number;
  };
  flags: {
    excludedWithSendHistory: number;
    landingLeadsWithValidStoredMetaLeadId: number;
    queuedForLeadsNoLongerQualifying: number;
  };
  recruitmentCampaigns: { campaignId: string | null; campaignName: string | null; verifiedId: boolean; leads: number; qualifyingLeads: number }[];
  summary: string[];
}

const rowKey = (leadKey: string, eventType: CrmEventType): string => `${leadKey}\u0000${eventType}`;

function emptyBucketCounts(): BucketCounts {
  return {
    alreadySentToCrm: 0,
    sentBeforeSwitch: 0,
    excluded: 0,
    missingMetaLeadId: 0,
    tooOld: 0,
    missingReliableDate: 0,
    failedOrSkipped: 0,
    sendable: 0,
  };
}

/** Whether the lead still calls for an event of this type under its current status. */
function stillWanted(lead: DryRunLead | undefined, eventType: CrmEventType): boolean {
  if (!lead || lead.status === null) return false;
  return eventType === "qualified" ? isQualified(lead.status) : isRegistered(lead.status);
}

export function buildDryRunReport(input: DryRunInput): DryRunReport {
  const { now, switchAt, leads, outbox, config } = input;
  const windowStart = now.getTime() - CRM_MAX_EVENT_AGE_MS;

  const rowByEvent = new Map<string, DryRunOutboxRow>();
  for (const row of outbox) {
    const key = rowKey(row.leadKey, row.eventType);
    if (!rowByEvent.has(key)) rowByEvent.set(key, row);
  }
  const leadByKey = new Map(leads.map((lead) => [lead.leadKey, lead] as const));

  const qualifiedBuckets = emptyBucketCounts();
  const registeredBuckets = emptyBucketCounts();
  let qualifyingTotal = 0;
  let registeredTotal = 0;
  let withVerifiedDate = 0;
  let dashboardLeads = 0;
  let statusRows = 0;
  let orphanStatusRows = 0;
  let excludedWithSendHistory = 0;
  let landingWithValidStoredMetaId = 0;

  for (const lead of leads) {
    if (lead.hasLeadRecord) dashboardLeads += 1;
    if (lead.status === null) continue;
    statusRows += 1;
    if (!lead.hasLeadRecord) orphanStatusRows += 1;

    const exclusion = exclusionFor(lead);
    const qualifiedRow = rowByEvent.get(rowKey(lead.leadKey, "qualified"));
    const registeredRow = rowByEvent.get(rowKey(lead.leadKey, "registered"));

    if (isQualified(lead.status)) {
      qualifyingTotal += 1;
      const bucket = classifyEvent({ leadKey: lead.leadKey, exclusion, row: qualifiedRow, statusUpdatedAt: lead.statusUpdatedAt, now, switchAt });
      qualifiedBuckets[bucket] += 1;
      if (qualifiedRow !== undefined && qualifiedRow.eventTime.getTime() >= windowStart) withVerifiedDate += 1;
      if (exclusion !== null && (qualifiedRow?.status === "sent" || registeredRow?.status === "sent")) excludedWithSendHistory += 1;
      if (
        lead.landingMetaLeadId !== null &&
        META_LEAD_ID_PATTERN.test(lead.landingMetaLeadId) &&
        !META_LEAD_ID_PATTERN.test(lead.leadKey)
      ) {
        landingWithValidStoredMetaId += 1;
      }
    }
    if (isRegistered(lead.status)) {
      registeredTotal += 1;
      const bucket = classifyEvent({ leadKey: lead.leadKey, exclusion, row: registeredRow, statusUpdatedAt: lead.statusUpdatedAt, now, switchAt });
      registeredBuckets[bucket] += 1;
    }
  }

  const outboxStats = {
    sentToCrmDataset: 0,
    sentBeforeSwitch: 0,
    queued: 0,
    failed: 0,
    skippedEventTooOld: 0,
    skippedInvalidMetaLeadId: 0,
    skippedOther: 0,
  };
  let queuedForLeadsNoLongerQualifying = 0;
  for (const row of outbox) {
    if (row.status === "sent") {
      if (row.sentAt === null || row.sentAt.getTime() >= switchAt.getTime()) outboxStats.sentToCrmDataset += 1;
      else outboxStats.sentBeforeSwitch += 1;
    } else if (row.status === "pending" || row.status === "retry" || row.status === "sending") {
      outboxStats.queued += 1;
      if (!stillWanted(leadByKey.get(row.leadKey), row.eventType)) queuedForLeadsNoLongerQualifying += 1;
    } else if (row.status === "failed") {
      outboxStats.failed += 1;
    } else if (row.lastError === "event_too_old") {
      outboxStats.skippedEventTooOld += 1;
    } else if (row.lastError === "invalid_meta_lead_id") {
      outboxStats.skippedInvalidMetaLeadId += 1;
    } else {
      outboxStats.skippedOther += 1;
    }
  }

  // Campaign IDs and names only, so the exclusion list can be checked by hand. Never a lead ID.
  const campaigns = new Map<string, DryRunReport["recruitmentCampaigns"][number]>();
  for (const lead of leads) {
    if (!lead.hasLeadRecord) continue;
    const exclusion = exclusionFor(lead);
    if (exclusion !== "verified_campaign_id" && exclusion !== "recruitment_name") continue;
    const key = `${lead.campaignId ?? ""}\u0000${lead.campaignName ?? ""}`;
    const entry = campaigns.get(key) ?? {
      campaignId: lead.campaignId,
      campaignName: lead.campaignName,
      verifiedId: lead.campaignId !== null && VERIFIED_CAMPAIGN_IDS.has(lead.campaignId),
      leads: 0,
      qualifyingLeads: 0,
    };
    entry.leads += 1;
    if (lead.status !== null && isQualified(lead.status)) entry.qualifyingLeads += 1;
    campaigns.set(key, entry);
  }

  const summary = [
    `לידים שעונים כרגע להגדרת QualifiedLead: ${qualifyingTotal}`,
    `מתוכם עם תאריך מאומת מה-7 הימים האחרונים: ${withVerifiedDate}`,
    `ניתנים לשליחה עכשיו: ${qualifiedBuckets.sendable}`,
    `אירועים שכבר נשלחו ל-dataset של ה-CRM: ${outboxStats.sentToCrmDataset}`,
    `ללא תאריך התקדמות מאומת (לא נשלחים): ${qualifiedBuckets.missingReliableDate}`,
    `ללא Meta Lead ID תקין: ${qualifiedBuckets.missingMetaLeadId}`,
    `מוחרגים (קמפיין גיוס או ייחוס לא ודאי): ${qualifiedBuckets.excluded}`,
    `ישנים מ-7 ימים (לא נשלחים): ${qualifiedBuckets.tooOld}`,
    `נשלחו לפני החלפת ה-dataset (דורשים אישור לפני שליחה חוזרת): ${qualifiedBuckets.sentBeforeSwitch}`,
    `נכשלו או דולגו מסיבה אחרת: ${qualifiedBuckets.failedOrSkipped}`,
    `RegisteredLead: ${registeredTotal} לידים, ניתנים לשליחה עכשיו: ${registeredBuckets.sendable}`,
    `שליחה למטא כרגע: ${config.sendingEnabled ? "פעילה" : "כבויה"}`,
  ];

  return {
    mode: "dry_run",
    generatedAt: now.toISOString(),
    window: {
      from: new Date(windowStart).toISOString(),
      to: now.toISOString(),
      days: CRM_MAX_EVENT_AGE_MS / (24 * 60 * 60 * 1000),
    },
    datasetSwitchedAt: switchAt.toISOString(),
    config,
    scanned: { dashboardLeads, statusRows, outboxRows: outbox.length, orphanStatusRows },
    qualifyingLeads: { total: qualifyingTotal, withVerifiedDateInWindow: withVerifiedDate, buckets: qualifiedBuckets },
    registeredLeads: { total: registeredTotal, buckets: registeredBuckets },
    outbox: outboxStats,
    flags: {
      excludedWithSendHistory,
      landingLeadsWithValidStoredMetaLeadId: landingWithValidStoredMetaId,
      queuedForLeadsNoLongerQualifying,
    },
    recruitmentCampaigns: [...campaigns.values()].sort((first, second) => second.leads - first.leads),
    summary,
  };
}
