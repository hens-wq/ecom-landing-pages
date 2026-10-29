import { Flame } from "lucide-react";

const MAX_RATING = 5;

/**
 * The CRM's Student Rating as flame icons, read-only (the CRM is the source of
 * truth). Blank when there is no rating - never a default. A value that isn't a
 * whole number from 1 to 5 is shown as the raw number rather than guessed at.
 */
export function StudentRatingFlames({ rating }: { rating: number | null }) {
  if (rating === null) return null;

  if (!Number.isInteger(rating) || rating < 1 || rating > MAX_RATING) {
    return <span dir="ltr">{rating}</span>;
  }

  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`דירוג תלמיד ${rating} מתוך ${MAX_RATING}`} title={`${rating}/${MAX_RATING}`}>
      {Array.from({ length: rating }, (_, index) => (
        <Flame key={index} aria-hidden="true" className="size-3.5 fill-orange-500 text-orange-500" />
      ))}
    </span>
  );
}
