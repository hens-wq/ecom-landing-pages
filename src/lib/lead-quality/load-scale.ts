import { presetDaysToDateRange } from "@/lib/advertising/date-range";
import type { AdvertisingSnapshot, DateRange } from "@/lib/advertising/types";
import { createCampaignScope } from "@/lib/campaign-scope";
import type { LeadFactsResult } from "@/lib/performance/types";
import { buildLeadQualityReport } from "./aggregate";
import { buildScaleAssessments, type ScaleAnalysisResponse } from "./scale";

export interface ScaleAnalysisSources {
  source: "meta" | "mock";
  readCampaigns(range: DateRange): Promise<AdvertisingSnapshot>;
  readLeadFacts(range: DateRange): Promise<LeadFactsResult>;
}

/** One server-resolved window for both spend and lead cohorts, independent of the page's date selection. */
export async function loadScaleAnalysis(now: Date, sources: ScaleAnalysisSources): Promise<ScaleAnalysisResponse> {
  const range = presetDaysToDateRange(30, now);
  const factsRequest = sources.source === "mock"
    ? Promise.resolve({ facts: null, failed: false })
    : sources.readLeadFacts(range).then(
      (facts) => ({ facts, failed: false }),
      () => ({ facts: null, failed: true }),
    );
  const [snapshot, loaded] = await Promise.all([sources.readCampaigns(range), factsRequest]);
  const facts = loaded.facts;
  const scope = createCampaignScope(snapshot.excludedCampaigns);
  const notices = sources.source === "mock"
    ? ["נתוני הדגמה: אין המלצות סקייל על בסיס נתוני פרסום סינתטיים."]
    : [facts?.sources.meta.message, facts?.sources.landing.message, facts?.sources.statuses.message]
      .filter((message): message is string => Boolean(message));
  if (loaded.failed) notices.push("נתוני הלידים לבדיקת הסקייל לא נטענו. לא ניתן להציע הגדלת תקציב כרגע.");
  const leadsKnown = facts !== null && facts.sources.meta.state === "ok" && facts.sources.landing.state === "ok";
  const hasUnlistedSpend = (snapshot.unlisted?.spend ?? 0) > 0;
  if (hasUnlistedSpend) notices.push("קיימת הוצאה ללא שיוך מלא לקמפיינים. הצעות להגדלת תקציב ממתינות לבדיקת השיוך.");
  const report = buildLeadQualityReport({
    campaigns: snapshot.campaigns,
    leads: (facts?.leads ?? []).filter((lead) => !scope.isExcluded(lead.campaignId)),
    range,
    statusFilter: "all",
    leadsKnown,
    unlisted: snapshot.unlisted,
  });
  return {
    assessments: buildScaleAssessments({ report, campaigns: snapshot.campaigns, hasUnlistedSpend, source: sources.source }),
    metadata: { range, generatedAt: now.toISOString(), source: sources.source, notices: [...new Set(notices)] },
  };
}
