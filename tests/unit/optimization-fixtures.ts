// Synthetic fixtures for the optimization tests. No real campaign, lead or customer data: every number is made up
// and chosen so the expected verdict can be checked by hand.
import type { WindowFigures } from "@/lib/optimization/derive";
import type { EngineInput, EntityInput, Level } from "@/lib/optimization/model";

export const TODAY = "2026-11-03";

/** Consecutive days starting 2026-10-27, so a 7-day selection ends on 2026-11-02 when it does not include today. */
export function completeDates(count: number): string[] {
  const start = Date.UTC(2026, 9, 27);
  return Array.from({ length: count }, (_, index) => new Date(start + index * 86_400_000).toISOString().slice(0, 10));
}

/**
 * A healthy window: CPL 80 ₪ (on target), CPA 800 ₪ with one registration, CTR 1.5%, CPM 40 ₪, frequency 2.5.
 * Override only the figures a test is about; the rest stay healthy, so a test never fires an unrelated rule.
 */
export function fig(overrides: Partial<WindowFigures> = {}): WindowFigures {
  return {
    leadsKnown: true,
    spend: 800,
    impressions: 20_000,
    linkClicks: 300,
    reach: 8_000,
    reachKnown: true,
    metaLeads: 10,
    metaFormLeads: 10,
    leads: 10,
    sales: 1,
    revenue: 0,
    green: 7,
    red: 1,
    pending: 2,
    unmapped: 0,
    unknownStatusLeads: 0,
    ...overrides,
  };
}

export function entity(overrides: Partial<EntityInput> & Pick<EntityInput, "level" | "id">): EntityInput {
  return {
    name: `יחידה ${overrides.id}`,
    status: "active",
    campaignId: "camp-1",
    campaignName: "קמפיין בדיקה",
    parentId: null,
    selected: fig(),
    trendCurrent: null,
    trendPrevious: null,
    ...overrides,
  };
}

export function ad(id: string, overrides: Partial<EntityInput> = {}): EntityInput {
  return entity({ level: "ad" as Level, id, parentId: "adset-1", ...overrides });
}

export function engineInput(entities: EntityInput[], overrides: Partial<EngineInput> = {}): EngineInput {
  return {
    rangeDays: 7,
    selectedPartial: false,
    completeDates: completeDates(7),
    trendAvailable: false,
    dailyAdSpend: null,
    entities,
    sourceNotes: [],
    ...overrides,
  };
}

/** The recommendation codes that an entity received, in the engine's order. */
export function codesFor(output: { recommendations: Array<{ id: string; ruleCode: string; level: string; entityId: string }> }, id: string): string[] {
  return output.recommendations.filter((recommendation) => recommendation.entityId === id).map((recommendation) => recommendation.ruleCode);
}

export function actionsFor(output: { recommendations: Array<{ action: string; entityId: string; ruleCode: string }> }, id: string): string[] {
  return output.recommendations.filter((recommendation) => recommendation.entityId === id).map((recommendation) => recommendation.action);
}
