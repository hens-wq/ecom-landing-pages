"use client";

import { useMemo } from "react";

import { ActionStatusControl } from "@/components/optimization/action-status";
import { AttributionNotice } from "@/components/optimization/attribution-notice";
import { CampaignDecisionsTable } from "@/components/optimization/campaign-decisions-table";
import { LandingDiagnostics } from "@/components/optimization/landing-diagnostics";
import { RecommendationCard } from "@/components/optimization/recommendation-card";
import { Bilingual, LEVEL_NAMES, ToneBadge, primaryRecommendation, recommendationIndex } from "@/components/optimization/shared";
import { campaignStatusesOf, inCampaignScope, type CampaignStatusFilter } from "@/lib/optimization/campaign-filter";
import {
  DECISION_LABELS,
  decideCampaigns,
  groupDataChecks,
  type CampaignDecision,
  type DataCheckTask,
} from "@/lib/optimization/campaign-decisions";
import { formatCount, formatIls, formatRangeDmy, formatRunTimestamp } from "@/lib/optimization/format";
import { PRIORITY_LABELS, type ActionStatus } from "@/lib/optimization/labels";
import type { Priority, Recommendation } from "@/lib/optimization/model";
import type { RunRecord } from "@/lib/optimization/run";

const PRIORITIES: Priority[] = [1, 2, 3, 4, 5, 6, 7, 8];

/** The decisions that ask for action now. KEEP, WATCH and INSUFFICIENT DATA stay in the table only. */
const ACTION_DECISIONS: ReadonlySet<CampaignDecision["decision"]> = new Set(["PAUSE_CANDIDATE", "INVESTIGATE", "SCALE_CANDIDATE"]);

/** The order the decisions are made in, written out for the person reading the report. */
const PRECEDENCE_RULES = [
  "1. נתונים: קמפיין שנתוני הלידים שלו פגומים מקבל DATA CHECK עם הפער המדויק. רק הקמפיין הזה נעצר, לא שאר הקמפיינים.",
  "2. בלי הוצאה ובלי חשיפה בטווח: INSUFFICIENT DATA, כי אין מה להעריך.",
  "3. קמפיין כבוי מתואר ככבוי, ולא כ'להשהות עכשיו'. אפשר להציע לשקול הפעלה מחדש.",
  "4. הרשמות ו-CPA לפני CPL. CPL לבדו לא עוצר קמפיין עם עלות הרשמה טובה.",
  "5. בלי תוצאה עסקית טובה: CPL חמור, איכות לידים בספירה (אדום מתוך מסווגים), מדגם קטן, ואז CPL כמעקב.",
  "6. מדדי חשיפה (CTR, CPC, CPM, Frequency) מסבירים מה לבדוק. הם לא דורסים תוצאה עסקית, וחוסר התראה אינו הוכחה להצלחה.",
  "7. הפעולה ברמה הנמוכה ביותר: מודעה לפני סט מודעות, וסט מודעות לפני קמפיין. לא מוצגים SCALE ו-PAUSE לאותה יחידה.",
];

interface SummaryTabProps {
  record: RunRecord;
  statuses: Record<string, ActionStatus>;
  onStatus: (recommendation: Recommendation, status: ActionStatus) => void;
  campaignStatus: CampaignStatusFilter;
}

/**
 * The business summary of one saved run, in four parts: 1) one decision per campaign, 2) the high-priority actions, each
 * listed once, 3) the per-unit detail, 4) the technical rules and the capture diagnostic. Everything comes from the same
 * snapshot, so the parts can never disagree.
 */
export function SummaryTab({ record, statuses, onStatus, campaignStatus }: SummaryTabProps) {
  const campaignStatuses = useMemo(() => campaignStatusesOf(record.output.entities), [record]);
  const index = useMemo(() => recommendationIndex(record.output.recommendations), [record]);

  const decisions = useMemo(
    () =>
      decideCampaigns(record.output, record.attributionGaps ?? null).filter((item) =>
        inCampaignScope(item.campaignId, campaignStatuses, campaignStatus)
      ),
    [record, campaignStatuses, campaignStatus]
  );
  const dataTasks = useMemo(() => groupDataChecks(decisions), [decisions]);
  const actionDecisions = useMemo(() => decisions.filter((item) => ACTION_DECISIONS.has(item.decision)), [decisions]);
  const visibleRecommendations = useMemo(
    () => record.output.recommendations.filter((item) => inCampaignScope(item.campaignId, campaignStatuses, campaignStatus)),
    [record, campaignStatuses, campaignStatus]
  );

  const groupedByPriority = useMemo(() => {
    const groups = new Map<Priority, Recommendation[]>();
    for (const priority of PRIORITIES) groups.set(priority, []);
    for (const item of visibleRecommendations) groups.get(item.priority)?.push(item);
    return groups;
  }, [visibleRecommendations]);

  const anchorOf = (campaignId: string): Recommendation | null => {
    const entity = record.output.entities.find((item) => item.level === "campaign" && item.id === campaignId);
    return entity ? primaryRecommendation(entity, index) : null;
  };
  const statusOf = (item: Recommendation): ActionStatus => statuses[item.id] ?? "pending";

  const campaignsForDiagnostic = record.output.entities
    .filter((item) => item.level === "campaign")
    .map((item) => ({ id: item.id, name: item.name }));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">
          <Bilingual en="Optimization Summary" he="סיכום אופטימיזציה" />
        </h2>
        <p className="text-xs text-slate-500">
          טווח: {formatRangeDmy(record.selected)} · הורץ: {formatRunTimestamp(record.createdAt)} · גרסת כללים: {record.ruleVersion}
        </p>
      </header>

      {/* 1. One decision per campaign. */}
      <CampaignDecisionsTable decisions={decisions} />

      {/* 2. High-priority actions, each listed once. */}
      <section className="space-y-3" aria-labelledby="high-priority-heading">
        <header className="space-y-1">
          <h2 id="high-priority-heading" className="text-base font-semibold text-slate-900">
            <Bilingual en="High-priority actions" he="פעולות בעדיפות גבוהה" />
          </h2>
          <p className="text-xs text-slate-500">
            כל פעולה מופיעה פעם אחת. פער נתונים שמשותף לכמה קמפיינים הוא משימה מרכזית אחת, עם רשימת היחידות שהוא נוגע בהן.
          </p>
        </header>

        {dataTasks.length === 0 && actionDecisions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
            אין כרגע פעולה בעדיפות גבוהה בסטטוס הנבחר. זה לא הוכחה להצלחה: בדקו את הטבלה למעלה.
          </p>
        ) : null}

        <div className="grid gap-4">
          {dataTasks.map((task) => (
            <DataTaskCard
              key={task.taskKey}
              task={task}
              units={affectedUnits(record, task)}
              anchor={anchorOf(task.campaigns[0].campaignId)}
              statusOf={statusOf}
              onStatus={onStatus}
            />
          ))}
          {actionDecisions.map((item) => {
            const anchor = anchorOf(item.campaignId);
            return (
              <ActionCard
                key={item.campaignId}
                decision={item}
                anchor={anchor}
                status={anchor ? statusOf(anchor) : "pending"}
                onStatus={(status) => anchor && onStatus(anchor, status)}
              />
            );
          })}
        </div>
      </section>

      {/* 3. Per-unit detail: every rule's output, by priority, collapsed by default. */}
      <details className="rounded-lg border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          <Bilingual en="Per-unit details" he="פירוט לפי קמפיין, סט מודעות ומודעה" />
        </summary>
        <div className="mt-4 space-y-6">
          {visibleRecommendations.length === 0 ? (
            <p className="text-sm text-slate-600">אין פירוט ליחידות בסטטוס הנבחר.</p>
          ) : null}
          {PRIORITIES.map((priority) => {
            const items = groupedByPriority.get(priority) ?? [];
            if (items.length === 0) return null;
            return (
              <section key={priority} className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  {priority}. {PRIORITY_LABELS[priority]} <span className="text-xs font-normal text-slate-500">({items.length})</span>
                </h3>
                <div className="grid gap-4">
                  {items.map((item) => (
                    <RecommendationCard
                      key={item.id}
                      recommendation={item}
                      status={statusOf(item)}
                      onStatus={(status) => onStatus(item, status)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </details>

      {/* 4. Technical: the rules applied, the data notes, and the capture diagnostic. Collapsed by default. */}
      <details className="rounded-lg border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          <Bilingual en="Technical diagnostics and rules applied" he="אבחון טכני וכללים שהופעלו" />
        </summary>
        <div className="mt-4 space-y-5">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">סדר ההחלטה</h3>
            <ol className="list-none space-y-1 text-sm text-slate-800">
              {PRECEDENCE_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
            <p className="text-xs text-slate-500">
              הספים לא השתנו. כל כלל מופיע בפירוט היחידה עם קוד הכלל שלו.
            </p>
          </section>

          <AttributionNotice gaps={record.attributionGaps ?? null} />

          {record.output.notes.length > 0 ? (
            <ul className="list-disc space-y-1 pr-5 text-sm text-slate-700">
              {record.output.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}

          <LandingDiagnostics range={record.selected} campaigns={campaignsForDiagnostic} />
        </div>
      </details>
    </div>
  );
}

/** The units a data gap touches: the child ad sets and ads whose own tracking check is part of the same task. */
function affectedUnits(record: RunRecord, task: DataCheckTask): string[] {
  const campaignIds = new Set(task.campaigns.map((item) => item.campaignId));
  const names = new Set<string>();
  for (const item of record.output.recommendations) {
    if (item.level === "campaign" || item.action !== "CHECK_DATA" || !campaignIds.has(item.campaignId)) continue;
    names.add(`${LEVEL_NAMES[item.level]} "${item.entityName}"`);
  }
  return [...names];
}

function DataTaskCard({
  task,
  units,
  anchor,
  statusOf,
  onStatus,
}: {
  task: DataCheckTask;
  units: string[];
  anchor: Recommendation | null;
  statusOf: (item: Recommendation) => ActionStatus;
  onStatus: (recommendation: Recommendation, status: ActionStatus) => void;
}) {
  const isCapture = task.taskKey === "lead-capture";
  const title = isCapture ? "בדיקת קליטת לידי דף הנחיתה" : "בדיקת סטטוסי הלידים";
  const en = isCapture ? "Lead capture check" : "Lead status check";
  const lead = isCapture
    ? "מקור הפער טרם אומת — נדרשת בדיקת קליטת לידי דף הנחיתה. לא להשהות ולא להגדיל את היחידות האלה עד שהפער מוסבר."
    : "סטטוסי לידים לא נטענו במלואם. ההרשמות וה-CPA של היחידות האלה אינם ודאיים עד טעינה מחדש.";

  return (
    <article className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900">
          <Bilingual en={en} he={title} />
        </h3>
        <ToneBadge tone={DECISION_LABELS.DATA_CHECK.tone} label={`${DECISION_LABELS.DATA_CHECK.en} · ${DECISION_LABELS.DATA_CHECK.he}`} />
      </header>
      <p className="text-sm text-slate-800">{lead}</p>
      <div>
        <p className="text-xs font-semibold text-slate-600">קמפיינים שהפער נוגע בהם:</p>
        <ul className="list-disc space-y-0.5 pr-5 text-sm text-slate-800">
          {task.campaigns.map((item) => (
            <li key={item.campaignId}>
              {item.campaignName}: {item.dataGap
                ? `Meta ${formatCount(item.dataGap.metaLeads)} · דשבורד ${formatCount(item.dataGap.dashboardLeads)}${
                    item.dataGap.unassigned > 0 ? ` · בטווח ${formatCount(item.dataGap.unassigned)} לידים בלי שיוך מלא` : ""
                  }`
                : ""}
            </li>
          ))}
        </ul>
      </div>
      {units.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-slate-600">יחידות שמופיעות בבדיקה הטכנית (פירוט ברמת כל יחידה למטה):</p>
          <ul className="list-disc space-y-0.5 pr-5 text-sm text-slate-700">
            {units.map((unit) => (
              <li key={unit}>{unit}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {anchor ? <ActionStatusControl status={statusOf(anchor)} onStatus={(status) => onStatus(anchor, status)} /> : null}
    </article>
  );
}

function ActionCard({
  decision,
  anchor,
  status,
  onStatus,
}: {
  decision: CampaignDecision;
  anchor: Recommendation | null;
  status: ActionStatus;
  onStatus: (status: ActionStatus) => void;
}) {
  const label = DECISION_LABELS[decision.decision];
  return (
    <article className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900">{decision.campaignName}</div>
          <div className="text-xs text-slate-500">
            <span dir="ltr" className="font-mono">{decision.campaignId}</span> · {LEVEL_NAMES.campaign}
            {decision.status !== "active" ? " · כבוי" : ""}
          </div>
        </div>
        <ToneBadge tone={label.tone} label={`${label.en} · ${label.he}`} />
      </header>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold text-slate-500">למה</dt>
          <dd className="text-slate-800">{decision.why}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold text-slate-500">הפעולה הבאה</dt>
          <dd className="text-slate-800">{decision.nextAction}</dd>
        </div>
        {decision.focus ? (
          <div>
            <dt className="text-[11px] font-semibold text-slate-500">מוקד הבדיקה</dt>
            <dd className="text-slate-800">
              {LEVEL_NAMES[decision.focus.level]} &quot;{decision.focus.name}&quot;, הוצאה {formatIls(decision.focus.spend)}: {decision.focus.ruleText}.
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[11px] font-semibold text-slate-500">עדיין לא ידוע</dt>
          <dd className="text-slate-800">{decision.stillUnknown}</dd>
        </div>
      </dl>
      {anchor ? <ActionStatusControl status={status} onStatus={onStatus} /> : null}
    </article>
  );
}
