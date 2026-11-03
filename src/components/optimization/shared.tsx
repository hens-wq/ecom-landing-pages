"use client";

import { cn } from "@/lib/utils";
import { TONE_LABELS, type Tone } from "@/lib/optimization/labels";
import type { EntityEvaluation, Recommendation } from "@/lib/optimization/model";
import { entityKey } from "@/lib/optimization/model";

/** Spec colours: Green = positive, Orange = watch, Red = problem, Blue = information or action, Gray = insufficient data. */
const TONE_CLASSES: Record<Tone, string> = {
  positive: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  watch: "bg-orange-100 text-orange-900 ring-orange-300",
  problem: "bg-red-100 text-red-900 ring-red-300",
  info: "bg-blue-100 text-blue-900 ring-blue-300",
  insufficient: "bg-slate-100 text-slate-600 ring-slate-300",
};

export function ToneBadge({ tone, label }: { tone: Tone; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", TONE_CLASSES[tone])}>
      {label ?? TONE_LABELS[tone]}
    </span>
  );
}

export const STATUS_TEXT: Record<EntityEvaluation["status"], string> = {
  active: "פעיל",
  paused: "כבוי",
  ended: "הסתיים",
};

export interface TreeNode {
  entity: EntityEvaluation;
  children: TreeNode[];
}

/** Campaign → ad set → ad, with each level sorted by spend (largest first), then by name. */
export function buildEntityTree(entities: EntityEvaluation[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  for (const entity of entities) nodes.set(entity.key, { entity, children: [] });

  const roots: TreeNode[] = [];
  for (const node of nodes.values()) {
    const { entity } = node;
    const parentKey =
      entity.level === "ad" && entity.parentId !== null
        ? entityKey("adset", entity.parentId)
        : entity.level === "adset" && entity.parentId !== null
          ? entityKey("campaign", entity.parentId)
          : null;
    const parent = parentKey === null ? undefined : nodes.get(parentKey);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const order = (a: TreeNode, b: TreeNode) => b.entity.selected.spend - a.entity.selected.spend || a.entity.name.localeCompare(b.entity.name, "he");
  const sortRecursively = (list: TreeNode[]) => {
    list.sort(order);
    for (const node of list) sortRecursively(node.children);
  };
  sortRecursively(roots);
  return roots;
}

/** The first recommendation of an entity, which is its most urgent one (recommendations are sorted by priority). */
export function primaryRecommendation(entity: EntityEvaluation, byId: ReadonlyMap<string, Recommendation>): Recommendation | null {
  for (const id of entity.recommendationIds) {
    const found = byId.get(id);
    if (found) return found;
  }
  return null;
}

export function recommendationIndex(recommendations: Recommendation[]): Map<string, Recommendation> {
  return new Map(recommendations.map((recommendation) => [recommendation.id, recommendation]));
}

export const LEVEL_NAMES = { campaign: "קמפיין", adset: "Ad Set", ad: "מודעה" } as const;
