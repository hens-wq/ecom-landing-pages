import type { DateRange } from "@/lib/advertising/types";
import type { LeadQualityStatusFilter } from "@/lib/lead-quality/types";

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export interface LeadQualityRequest {
  range: DateRange;
  campaignStatus: LeadQualityStatusFilter;
}

/** Validate the complete selection before any Meta or database work is started. */
export function parseLeadQualityRequest(params: URLSearchParams): LeadQualityRequest | null {
  const since = params.get("since") ?? "";
  const until = params.get("until") ?? "";
  const campaignStatus = params.get("campaignStatus") ?? "active";
  if (!isCalendarDate(since) || !isCalendarDate(until) || since > until) return null;
  if (campaignStatus !== "active" && campaignStatus !== "inactive" && campaignStatus !== "all") return null;
  return { range: { since, until }, campaignStatus };
}
