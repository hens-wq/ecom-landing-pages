import { Flame } from "lucide-react";

import { effectiveStudentRating } from "@/lib/lead-status/student-rating";

const MAX_RATING = 5;

/**
 * A missing CRM rating displays the ordinary two-flame business default.
 * This presentation never changes the stored CRM value. Invalid values stay visible.
 */
export function StudentRatingFlames({ rating: sourceRating }: { rating: number | null | undefined }) {
  const rating = effectiveStudentRating(sourceRating);
  if (!Number.isInteger(rating) || rating < 1 || rating > MAX_RATING) {
    return <span dir="ltr" className="text-foreground" title="ערך דירוג לא מוכר מה־CRM" aria-label={`ערך דירוג לא מוכר: ${rating}`}>{rating}</span>;
  }

  const classification = rating >= 4 ? "מצוין" : rating >= 2 ? "רגיל" : "קר, דירוג היסטורי";
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`דירוג תלמיד ${rating} מתוך ${MAX_RATING}, ${classification}`} title={`${rating}/${MAX_RATING} · ${classification}`}>
      {Array.from({ length: rating }, (_, index) => (
        <Flame key={index} aria-hidden="true" className="size-3.5 fill-orange-500 text-orange-500" />
      ))}
    </span>
  );
}

export function StudentRatingLegend() {
  return (
    <div dir="rtl" aria-label="מקרא דירוג תלמיד" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-foreground">
      <span className="inline-flex items-center gap-1"><Flame className="size-3.5 fill-orange-500 text-orange-500" aria-hidden="true" /><strong>דירוג תלמיד:</strong></span>
      <span>2–3 להבות · רגיל</span>
      <span>4–5 להבות · מצוין</span>
      <span>להבה אחת · קר (היסטורי)</span>
    </div>
  );
}
