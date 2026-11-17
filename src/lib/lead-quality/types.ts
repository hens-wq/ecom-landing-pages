import type { DateRange } from "@/lib/advertising/types";
import type { LeadQuality } from "@/lib/performance/lead-quality";
import type { LeadFact } from "@/lib/performance/types";
import type { Campaign, EntityStatus, RawMetrics } from "@/lib/types";

export type LeadQualityStatusFilter = "active" | "inactive" | "all";
export type LeadQualityColor = "green" | "orange" | "red" | "neutral";

export interface LeadQualityCount {
  count: number;
  /** Percent of ALL leads in this row (0–100), never of classified leads only. Null for no leads or incomplete lead sources. */
  percent: number | null;
}

export interface LeadQualityStatusColumn {
  id: string;
  mainStatus: string;
  secondaryStatus: string;
  /** Full, human-readable status pair; the main status is a group, not a metric. */
  label: string;
  color: LeadQualityColor;
  classification: LeadQuality | "unknown";
}

export interface LeadQualityStatusGroup {
  id: string;
  label: string;
  statuses: LeadQualityStatusColumn[];
}

export interface LeadQualityReason extends LeadQualityCount {
  statusId: string;
  label: string;
  color: LeadQualityColor;
}

/** Separate quality: 2–3 ordinary, 4–5 excellent. Known null/undefined ratings report as 2; raw values stay unchanged. */
export interface LeadStudentRatingSummary {
  ordinary: LeadQualityCount;
  excellent: LeadQualityCount;
  /** Ratings 3–5 out of ALL incoming cohort leads. Independent of excellent quality (4–5) and registrations. */
  cooperation?: LeadQualityCount;
  /** Legacy 1-flame records are retained, never silently turned into ordinary leads. */
  cold: LeadQualityCount;
  /** Technically unavailable or invalid ratings only, not a known missing rating (which reports as ordinary 2). */
  unrated: LeadQualityCount;
  /** All reportable ratings, including the business default of 2; not a count of CRM-synced values. */
  rated: LeadQualityCount;
  /** Reporting-only provenance: known null/undefined values included as 2. Optional for older saved summaries. */
  defaulted?: LeadQualityCount;
  byRating: Record<"1" | "2" | "3" | "4" | "5", LeadQualityCount>;
  /** Known spend per excellent lead when the cohort is reportable in full, including ordinary default-2 leads. */
  costPerExcellent: number | null;
  complete: boolean;
}

export interface LeadQualitySummary {
  relevant: LeadQualityCount;
  irrelevant: LeadQualityCount;
  /** Pending, unmapped and unavailable statuses combined, so the three segments cover every lead. */
  undetermined: LeadQualityCount;
  pending: LeadQualityCount;
  unmapped: LeadQualityCount;
  unknown: LeadQualityCount;
  sales: LeadQualityCount;
  costPerSale: number | null;
  qualifiedCpl: number | null;
  revenue: number;
  /** Only recorded secondary reasons, excluding lifecycle states such as new, unanswered or enrolled. */
  commonReasons: LeadQualityReason[];
  topReason: LeadQualityReason | null;
  /** Optional for older saved responses; newly built reports always include it. */
  studentRating?: LeadStudentRatingSummary;
}

export interface LeadQualityRow {
  id: string;
  name: string;
  level: "campaign" | "adset" | "ad" | "total";
  status: EntityStatus | null;
  /** Null for synthetic lead-only rows: they have no independently attributable spend. */
  spend: number | null;
  totalLeads: number;
  cpl: number | null;
  leadsKnown: boolean;
  unknownStatusLeads: number;
  isUnassigned: boolean;
  isUnlisted: boolean;
  statusCounts: Record<string, LeadQualityCount>;
  summary: LeadQualitySummary;
}

export interface LeadQualityAd extends LeadQualityRow {
  level: "ad";
  campaignId: string;
  adSetId: string | null;
  adSetName: string | null;
}

export interface LeadQualityAdSet extends LeadQualityRow {
  level: "adset";
  campaignId: string;
  /** Actual listed ad IDs in source order. Full rows live once in campaign.ads to keep API payloads bounded. */
  adIds: string[];
  /** Included in this set's overview but shown once in the campaign's combined unassigned-ad row. */
  unassignedLeadCount: number;
}

export interface LeadQualityCampaign extends LeadQualityRow {
  level: "campaign";
  /** Actual ad sets in source order, including empty/inactive sets. Their status comes from the source, never children. */
  adSets: LeadQualityAdSet[];
  /** All ads flattened across ad sets, plus a visible lead-only row when an ad is unidentified. */
  ads: LeadQualityAd[];
}

export interface LeadQualityReport {
  range: DateRange;
  statusFilter: LeadQualityStatusFilter;
  groups: LeadQualityStatusGroup[];
  campaigns: LeadQualityCampaign[];
  totals: LeadQualityRow;
  /** Leads with no listed campaign remain visible separately, regardless of the current status filter. */
  unassigned: LeadQualityCampaign | null;
  /** Delivery that could not be assigned to a listed campaign; never silently added to active-only spend. */
  unlistedSpend: number;
  diagnostics: {
    duplicateLeadIds: number;
    outsideRangeLeads: number;
    invalidDateLeads: number;
    unassignedLeads: number;
    unknownStatusLeads: number;
    unmappedStatusLeads: number;
    conflictingAttributionLeads: number;
  };
}

export interface BuildLeadQualityReportInput {
  campaigns: Campaign[];
  leads: LeadFact[];
  range: DateRange;
  statusFilter?: LeadQualityStatusFilter;
  /** False when any expected lead source failed. Counts are observed lower bounds and percentages/costs stay unknown. */
  leadsKnown?: boolean;
  unlisted?: RawMetrics | null;
}

export interface LeadQualityApiResponse {
  report: LeadQualityReport;
  metadata: {
    source: "meta" | "mock";
    generatedAt: string;
    notices: string[];
    sources?: import("@/lib/performance/types").LeadFactsResult["sources"];
  };
}
