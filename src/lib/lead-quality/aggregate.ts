import { calcCPL, calcCostPerSale } from "@/lib/calculations";
import { classifyAttribution, listedIdsOf } from "@/lib/performance/attribution";
import { activeAmount, isSaleStatus } from "@/lib/performance/lead-metrics";
import { classifyLeadQuality, normalizeStatusLabel } from "@/lib/performance/lead-quality";
import { MAIN_STATUSES, SECONDARY_STATUSES_BY_MAIN } from "@/lib/lead-status/types";
import type { LeadFact } from "@/lib/performance/types";
import type { Ad, AdSet, Campaign } from "@/lib/types";
import { summarizeStudentRatings } from "./student-rating";
import type {
  BuildLeadQualityReportInput,
  LeadQualityAd,
  LeadQualityAdSet,
  LeadQualityCampaign,
  LeadQualityColor,
  LeadQualityCount,
  LeadQualityReport,
  LeadQualityRow,
  LeadQualityStatusColumn,
  LeadQualityStatusFilter,
  LeadQualityStatusGroup,
} from "./types";

const UNKNOWN_MAIN = "סטטוס לא ידוע";
const MISSING_MAIN = "ללא סטטוס ראשי";
const UNKNOWN_SECONDARY = "לא ניתן לטעון סטטוס";
const MISSING_SECONDARY = "ללא סטטוס משני";
const REASON_GROUPS = new Set<string>(["לא מעוניין", "ליד שגוי", "רשימה שחורה", "ביטול הרשמה"]);

export function leadQualityStatusId(mainStatus: string, secondaryStatus: string): string {
  return `${encodeURIComponent(normalizeStatusLabel(mainStatus))}:${encodeURIComponent(normalizeStatusLabel(secondaryStatus))}`;
}

/** Expands the CRM's abbreviations for display only; classification still uses the original secondary status. */
export function fullSecondaryStatusLabel(mainStatus: string, secondaryStatus: string): string {
  const main = normalizeStatusLabel(mainStatus);
  const secondary = normalizeStatusLabel(secondaryStatus);
  if (main === secondary || main === MISSING_MAIN || main === UNKNOWN_MAIN) return secondary;
  const prefixByMain: Record<string, RegExp> = {
    "אין מענה": /^א"מ\s*-\s*/,
    "לא מעוניין": /^ל"מ\s*-\s*/,
    "רשימה שחורה": /^ר"ש\s*-\s*/,
    "ביטול הרשמה": /^ביטל הרשמה\s*-\s*/,
  };
  const detail = prefixByMain[main] ? secondary.replace(prefixByMain[main], "") : secondary;
  if (detail.startsWith(`${main} - `)) return detail;
  return `${main} - ${detail}`;
}

function colorFor(classification: LeadQualityStatusColumn["classification"]): LeadQualityColor {
  if (classification === "green") return "green";
  if (classification === "red") return "red";
  if (classification === "pending") return "orange";
  return "neutral";
}

function statusPair(lead: LeadFact): { main: string; secondary: string; unknown: boolean } {
  if (!lead.statusKnown) return { main: UNKNOWN_MAIN, secondary: UNKNOWN_SECONDARY, unknown: true };
  const main = normalizeStatusLabel(lead.mainStatus ?? "") || MISSING_MAIN;
  if (!lead.secondaryStatus?.trim()) return { main, secondary: MISSING_SECONDARY, unknown: true };
  return { main, secondary: lead.secondaryStatus, unknown: false };
}

function buildStatusCatalog(leads: LeadFact[]): { groups: LeadQualityStatusGroup[]; columns: Map<string, LeadQualityStatusColumn> } {
  const groups = new Map<string, LeadQualityStatusGroup>();
  const columns = new Map<string, LeadQualityStatusColumn>();
  function add(main: string, secondary: string, unknown = false): void {
    const normalizedMain = normalizeStatusLabel(main);
    const id = leadQualityStatusId(normalizedMain, secondary);
    if (columns.has(id)) return;
    const classification = unknown ? "unknown" : classifyLeadQuality(secondary);
    const column: LeadQualityStatusColumn = {
      id,
      mainStatus: normalizedMain,
      secondaryStatus: secondary,
      label: fullSecondaryStatusLabel(normalizedMain, secondary),
      color: colorFor(classification),
      classification,
    };
    let group = groups.get(normalizedMain);
    if (!group) {
      group = { id: normalizedMain, label: normalizedMain, statuses: [] };
      groups.set(normalizedMain, group);
    }
    group.statuses.push(column);
    columns.set(id, column);
  }
  for (const main of MAIN_STATUSES) {
    for (const secondary of SECONDARY_STATUSES_BY_MAIN[main]) add(main, secondary);
  }
  for (const lead of leads) {
    const pair = statusPair(lead);
    add(pair.main, pair.secondary, pair.unknown);
  }
  return { groups: [...groups.values()], columns };
}

function validReportingDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function spendOf(ads: readonly Ad[]): number | null {
  let total = 0;
  for (const ad of ads) {
    if (!Number.isFinite(ad.metrics.spend)) return null;
    total += ad.metrics.spend;
  }
  return total;
}

function combineSpend(rows: readonly LeadQualityRow[]): number | null {
  if (rows.some((row) => row.spend === null)) return null;
  return rows.reduce((sum, row) => sum + (row.spend ?? 0), 0);
}

function matchesStatus(status: Campaign["status"], filter: LeadQualityStatusFilter): boolean {
  return filter === "all" || (filter === "active" ? status === "active" : status !== "active");
}

type RowIdentity = Pick<LeadQualityRow, "id" | "name" | "level" | "status" | "isUnassigned" | "isUnlisted">;

function summarizeRow(
  identity: RowIdentity,
  leads: readonly LeadFact[],
  spend: number | null,
  columns: ReadonlyMap<string, LeadQualityStatusColumn>,
  leadsKnown: boolean,
): LeadQualityRow {
  const countByStatus = new Map<string, number>();
  const quality = { green: 0, red: 0, pending: 0, unmapped: 0, unknown: 0 };
  let sales = 0;
  let revenue = 0;
  for (const lead of leads) {
    const pair = statusPair(lead);
    const id = leadQualityStatusId(pair.main, pair.secondary);
    countByStatus.set(id, (countByStatus.get(id) ?? 0) + 1);
    const classification = columns.get(id)?.classification ?? "unknown";
    quality[classification] += 1;
    if (lead.statusKnown && isSaleStatus(lead.mainStatus)) {
      sales += 1;
      revenue += activeAmount(lead.mainStatus, lead.secondaryStatus, lead.fullPaymentAmount, lead.partialPaymentAmount) ?? 0;
    }
  }

  const totalLeads = leads.length;
  const counted = (count: number): LeadQualityCount => ({
    count,
    percent: leadsKnown && totalLeads > 0 ? (count / totalLeads) * 100 : null,
  });
  const statusCounts: Record<string, LeadQualityCount> = {};
  for (const id of columns.keys()) statusCounts[id] = counted(countByStatus.get(id) ?? 0);
  const commonReasons = [...columns.values()]
    .filter((column) => REASON_GROUPS.has(column.mainStatus) && column.classification !== "unknown" && (countByStatus.get(column.id) ?? 0) > 0)
    .map((column) => ({ statusId: column.id, label: column.label, color: column.color, ...counted(countByStatus.get(column.id) ?? 0) }))
    .sort((a, b) => b.count - a.count);
  const costBasis = leadsKnown ? spend : null;
  return {
    ...identity,
    spend,
    totalLeads,
    cpl: costBasis === null ? null : calcCPL(costBasis, totalLeads),
    leadsKnown,
    unknownStatusLeads: quality.unknown,
    statusCounts,
    summary: {
      relevant: counted(quality.green),
      irrelevant: counted(quality.red),
      undetermined: counted(quality.pending + quality.unmapped + quality.unknown),
      pending: counted(quality.pending),
      unmapped: counted(quality.unmapped),
      unknown: counted(quality.unknown),
      sales: { ...counted(sales), percent: quality.unknown > 0 ? null : counted(sales).percent },
      costPerSale: costBasis === null || quality.unknown > 0 ? null : calcCostPerSale(costBasis, sales),
      qualifiedCpl: costBasis === null || quality.unknown > 0 ? null : calcCPL(costBasis, quality.green),
      revenue,
      commonReasons,
      topReason: commonReasons[0] ?? null,
      studentRating: summarizeStudentRatings(leads, spend, leadsKnown),
    },
  };
}

/**
 * Pure cohort report: source dates are already in Asia/Jerusalem, and statuses are the current records.
 * It never filters by status-update or sale date. Advertising spends cover the same supplied range.
 * Attribution follows the existing deepest-listed-ID rule: ad, then ad set, then campaign; never names.
 * Duplicate source IDs are counted once (the last supplied fact wins); distinct IDs sharing a phone are unrelated.
 * Filtered totals cover listed campaigns only. Unassigned leads and unlisted spend are returned separately so an
 * unknown current campaign status is never silently called active/inactive or mixed into a selected spend scope.
 */
export function buildLeadQualityReport(input: BuildLeadQualityReportInput): LeadQualityReport {
  const { range, campaigns } = input;
  const filter = input.statusFilter ?? "active";
  const leadsKnown = input.leadsKnown ?? true;
  const unique = new Map<string, LeadFact>();
  let duplicateLeadIds = 0;
  for (const lead of input.leads) {
    if (unique.has(lead.id)) duplicateLeadIds += 1;
    unique.set(lead.id, lead);
  }
  let outsideRangeLeads = 0;
  let invalidDateLeads = 0;
  const leads: LeadFact[] = [];
  for (const lead of unique.values()) {
    if (!validReportingDate(lead.leadDate)) invalidDateLeads += 1;
    else if (lead.leadDate < range.since || lead.leadDate > range.until) outsideRangeLeads += 1;
    else leads.push(lead);
  }
  const catalog = buildStatusCatalog(leads);
  const listed = listedIdsOf(campaigns);
  const campaignLeads = new Map<string, LeadFact[]>();
  const adLeads = new Map<string, LeadFact[]>();
  const adSetLeads = new Map<string, LeadFact[]>();
  const unidentifiedAdSetLeadCounts = new Map<string, number>();
  const unidentifiedAdLeads = new Map<string, LeadFact[]>();
  const adParents = new Map<string, { campaign: Campaign; adSet: AdSet }>();
  const adSetParents = new Map<string, Campaign>();
  const unassignedLeads: LeadFact[] = [];
  let conflictingAttributionLeads = 0;
  for (const campaign of campaigns) {
    for (const adSet of campaign.adSets) {
      adSetParents.set(adSet.id, campaign);
      for (const ad of adSet.ads) adParents.set(ad.id, { campaign, adSet });
    }
  }
  function append(map: Map<string, LeadFact[]>, id: string, lead: LeadFact): void {
    const existing = map.get(id);
    if (existing) existing.push(lead);
    else map.set(id, [lead]);
  }
  for (const lead of leads) {
    const outcome = classifyAttribution(lead, listed);
    let campaignId: string | null = null;
    if (outcome === "ad" && lead.adId) {
      const parent = adParents.get(lead.adId)!;
      campaignId = parent.campaign.id;
      append(adLeads, lead.adId, lead);
      append(adSetLeads, parent.adSet.id, lead);
      if ((lead.campaignId && lead.campaignId !== campaignId) || (lead.adSetId && lead.adSetId !== parent.adSet.id)) conflictingAttributionLeads += 1;
    } else if (outcome === "adset" && lead.adSetId) {
      campaignId = adSetParents.get(lead.adSetId)!.id;
      append(adSetLeads, lead.adSetId, lead);
      unidentifiedAdSetLeadCounts.set(lead.adSetId, (unidentifiedAdSetLeadCounts.get(lead.adSetId) ?? 0) + 1);
      append(unidentifiedAdLeads, campaignId, lead);
      if (lead.campaignId && lead.campaignId !== campaignId) conflictingAttributionLeads += 1;
    } else if (outcome === "campaign" && lead.campaignId) {
      campaignId = lead.campaignId;
      append(unidentifiedAdLeads, campaignId, lead);
    }
    if (campaignId) append(campaignLeads, campaignId, lead);
    else unassignedLeads.push(lead);
  }

  const selected = campaigns.filter((campaign) => matchesStatus(campaign.status, filter));
  const rows: LeadQualityCampaign[] = selected.map((campaign) => {
    const ads: LeadQualityAd[] = [];
    const adSets: LeadQualityAdSet[] = [];
    for (const adSet of campaign.adSets) {
      const adIds: string[] = [];
      for (const ad of adSet.ads) {
        const adRow: LeadQualityAd = {
          ...summarizeRow({ id: ad.id, name: ad.name, level: "ad", status: ad.status, isUnassigned: false, isUnlisted: false }, adLeads.get(ad.id) ?? [], spendOf([ad]), catalog.columns, leadsKnown),
          level: "ad", campaignId: campaign.id, adSetId: adSet.id, adSetName: adSet.name,
        };
        adIds.push(adRow.id);
        ads.push(adRow);
      }
      adSets.push({
        ...summarizeRow({ id: adSet.id, name: adSet.name, level: "adset", status: adSet.status, isUnassigned: false, isUnlisted: false }, adSetLeads.get(adSet.id) ?? [], spendOf(adSet.ads), catalog.columns, leadsKnown),
        level: "adset", campaignId: campaign.id, adIds,
        unassignedLeadCount: unidentifiedAdSetLeadCounts.get(adSet.id) ?? 0,
      });
    }
    const unattributed = unidentifiedAdLeads.get(campaign.id) ?? [];
    if (unattributed.length > 0) {
      ads.push({
        ...summarizeRow({ id: `unassigned-ad:${campaign.id}`, name: "לידים ללא שיוך למודעה", level: "ad", status: null, isUnassigned: true, isUnlisted: false }, unattributed, null, catalog.columns, leadsKnown),
        level: "ad", campaignId: campaign.id, adSetId: null, adSetName: null,
      });
    }
    return {
      ...summarizeRow({ id: campaign.id, name: campaign.name, level: "campaign", status: campaign.status, isUnassigned: false, isUnlisted: false }, campaignLeads.get(campaign.id) ?? [], spendOf(campaign.adSets.flatMap((adSet) => adSet.ads)), catalog.columns, leadsKnown),
      level: "campaign", adSets, ads,
    };
  });
  const selectedLeads = selected.flatMap((campaign) => campaignLeads.get(campaign.id) ?? []);
  const totals = summarizeRow({ id: "lead-quality-total", name: "סיכום הקמפיינים המוצגים", level: "total", status: null, isUnassigned: false, isUnlisted: false }, selectedLeads, combineSpend(rows), catalog.columns, leadsKnown);
  const unassigned: LeadQualityCampaign | null = unassignedLeads.length > 0 ? {
    ...summarizeRow({ id: "lead-quality-unassigned", name: "לידים ללא שיוך לקמפיין", level: "campaign", status: null, isUnassigned: true, isUnlisted: false }, unassignedLeads, null, catalog.columns, leadsKnown),
    level: "campaign", adSets: [], ads: [],
  } : null;
  return {
    range: { ...range }, statusFilter: filter, groups: catalog.groups, campaigns: rows, totals, unassigned,
    unlistedSpend: input.unlisted?.spend ?? 0,
    diagnostics: {
      duplicateLeadIds, outsideRangeLeads, invalidDateLeads, unassignedLeads: unassignedLeads.length,
      unknownStatusLeads: leads.filter((lead) => statusPair(lead).unknown).length,
      unmappedStatusLeads: leads.filter((lead) => !statusPair(lead).unknown && classifyLeadQuality(lead.secondaryStatus) === "unmapped").length,
      conflictingAttributionLeads,
    },
  };
}
