import { leads } from "@/lib/mock-data/leads";
import { sales } from "@/lib/mock-data/sales";
import { matchSales } from "@/lib/matching";
import { safeDivide } from "@/lib/calculations";

export const salesMatches = matchSales(sales, leads);

export interface SalesMatchStats {
  total: number;
  matched: number;
  needsReview: number;
  unmatched: number;
  matchRate: number | null;
}

const matched = salesMatches.filter((m) => m.matchStatus === "matched").length;
const needsReview = salesMatches.filter((m) => m.matchStatus === "needs_review").length;
const unmatched = salesMatches.filter((m) => m.matchStatus === "unmatched").length;
const total = salesMatches.length;
const matchRateRatio = safeDivide(matched, total);

export const salesMatchStats: SalesMatchStats = {
  total,
  matched,
  needsReview,
  unmatched,
  matchRate: matchRateRatio === null ? null : matchRateRatio * 100,
};
