import { CONCENTRATION_MIN_DAYS, CONCENTRATION_SHARE_MIN, OTHER_AD_SHARE_MAX } from "@/lib/optimization/thresholds";
import type { DailyAdSpendRow } from "@/lib/optimization/model";

export type ConcentrationStatus = "no_daily_data" | "not_enough_days" | "no_concentration" | "concentrated";

export interface CampaignConcentration {
  campaignId: string;
  status: ConcentrationStatus;
  completeDays: number;
  dominantAdId: string | null;
  /** Longest run of consecutive complete days on which the dominant ad had at least the share bar. */
  streakDays: number;
  /**
   * Other ads marked "Insufficient Delivery – Cannot Evaluate Fairly". Set only when every other ad in the campaign got
   * less than OTHER_AD_SHARE_MAX percent of the window spend. Such ads are never called failing.
   */
  insufficientAdIds: string[];
}

export interface ConcentrationInput {
  campaignId: string;
  /** This campaign's daily ad spend, or null when the daily breakdown could not be read. */
  rows: DailyAdSpendRow[] | null;
  /** Complete days of the selected range, ascending. Partial days never count. */
  completeDates: string[];
  /** Selected-window spend of each ad in the campaign. */
  windowSpendByAd: ReadonlyMap<string, number>;
  /** Selected-window spend of the whole campaign. */
  windowSpend: number;
}

/**
 * Finds a dominant ad: one ad with at least CONCENTRATION_SHARE_MIN percent of its campaign's spend on at least
 * CONCENTRATION_MIN_DAYS consecutive complete days. A day with no spend breaks the run.
 */
export function detectCampaignConcentration(input: ConcentrationInput): CampaignConcentration {
  const base = {
    campaignId: input.campaignId,
    completeDays: input.completeDates.length,
    dominantAdId: null,
    streakDays: 0,
    insufficientAdIds: [] as string[],
  };
  if (input.rows === null) return { ...base, status: "no_daily_data" };
  if (input.completeDates.length < CONCENTRATION_MIN_DAYS) return { ...base, status: "not_enough_days" };

  const completeSet = new Set(input.completeDates);
  const spendByDateAndAd = new Map<string, Map<string, number>>();
  for (const row of input.rows) {
    if (!completeSet.has(row.date) || row.spend <= 0) continue;
    const perAd = spendByDateAndAd.get(row.date) ?? new Map<string, number>();
    perAd.set(row.adId, (perAd.get(row.adId) ?? 0) + row.spend);
    spendByDateAndAd.set(row.date, perAd);
  }

  let bestAd: string | null = null;
  let bestStreak = 0;
  let runAd: string | null = null;
  let runLength = 0;
  for (const date of input.completeDates) {
    const perAd = spendByDateAndAd.get(date);
    let total = 0;
    let topAd: string | null = null;
    let topSpend = 0;
    if (perAd) {
      for (const [adId, spend] of perAd) {
        total += spend;
        if (spend > topSpend) {
          topSpend = spend;
          topAd = adId;
        }
      }
    }
    const share = total > 0 ? (topSpend / total) * 100 : 0;
    if (topAd !== null && share >= CONCENTRATION_SHARE_MIN) {
      if (topAd === runAd) {
        runLength += 1;
      } else {
        runAd = topAd;
        runLength = 1;
      }
      if (runLength > bestStreak) {
        bestStreak = runLength;
        bestAd = runAd;
      }
    } else {
      runAd = null;
      runLength = 0;
    }
  }

  if (bestAd === null || bestStreak < CONCENTRATION_MIN_DAYS) return { ...base, status: "no_concentration" };

  const others = [...input.windowSpendByAd.entries()].filter(([adId]) => adId !== bestAd);
  const allOthersBelowBar =
    input.windowSpend > 0 && others.every(([, spend]) => (spend / input.windowSpend) * 100 < OTHER_AD_SHARE_MAX);
  return {
    ...base,
    status: "concentrated",
    dominantAdId: bestAd,
    streakDays: bestStreak,
    insufficientAdIds: allOthersBelowBar ? others.map(([adId]) => adId) : [],
  };
}
