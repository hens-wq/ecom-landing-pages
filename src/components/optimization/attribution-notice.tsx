import { ToneBadge } from "@/components/optimization/shared";
import { formatCount } from "@/lib/optimization/format";
import { LEAD_DATA_STATE_LABELS } from "@/lib/optimization/lead-data-state";
import type { AttributionGaps } from "@/lib/performance/attribution";

/**
 * The window-wide gap notice: leads of the selected range that no unit carries. It explains why a unit can show fewer
 * leads than Meta reports, so that a unit is never shown as zero leads for that reason.
 */
export function AttributionNotice({ gaps }: { gaps: AttributionGaps | null | undefined }) {
  if (!gaps || gaps.unassigned === 0) return null;
  const label = LEAD_DATA_STATE_LABELS.attribution_missing;
  return (
    <section className="space-y-2 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950" aria-label="Attribution Missing">
      <div className="flex flex-wrap items-center gap-2">
        <ToneBadge tone={label.tone} label={`${label.en} · ${label.he}`} />
        <span className="font-semibold">{formatCount(gaps.unassigned)} לידים בטווח בלי שיוך מלא ליחידה</span>
      </div>
      <p className="text-xs leading-relaxed">
        בלי מזהה: {formatCount(gaps.noIds)} · מזהה שלא נמצא ברשימה הנוכחית: {formatCount(gaps.idNotListed)} · מדפי נחיתה: {formatCount(gaps.landing)}.
        הלידים האלה נספרים במספרי החשבון, אבל לא ביחידה. לכן יחידה בלי לידים משויכים לא מוצגת כאפס.
      </p>
      <p className="text-xs leading-relaxed">
        כדי שהלידים הבאים יישויכו: כתובת המודעה ב-Meta צריכה להעביר לדף הנחיתה{" "}
        <span dir="ltr" className="font-mono">
          {"campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}"}
        </span>
        . לידים שנשמרו בלי מזהה (ובלי מזהה מספרי ב-utm_campaign) אינם ניתנים לשיוך מחדש.
      </p>
    </section>
  );
}
