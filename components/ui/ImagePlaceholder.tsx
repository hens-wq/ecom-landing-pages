import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImagePlaceholderProps {
  /** e.g. "9/16", "4/5", "16/9", "1/1". Omit when `fill` is true. */
  aspectRatio?: string;
  /** Short internal name, shown in the placeholder itself, e.g. "Hero — Cyber operator" */
  label: string;
  /** Composition / art-direction notes for whoever supplies the final asset */
  description?: string;
  className?: string;
  /** Once a real asset exists, pass its src (and alt) — the placeholder disappears automatically. */
  src?: string;
  alt?: string;
  priority?: boolean;
  sizes?: string;
  /** Absolutely fills the nearest positioned ancestor instead of sizing by aspect ratio — for full-bleed backgrounds (e.g. a hero). */
  fill?: boolean;
  /**
   * Tailwind object-position utility for the `<Image>` itself, e.g.
   * `"object-[32%_38%] lg:object-center"` — lets a crop keep a face or
   * other focal point in frame instead of defaulting to dead-center.
   */
  imagePosition?: string;
}

/**
 * Documents exactly what image is expected in a slot, at the exact
 * aspect ratio the layout needs, so the visual composition can be judged
 * before a single real asset exists. Swap in `src` later — no layout or
 * markup changes required elsewhere.
 */
export function ImagePlaceholder({
  aspectRatio,
  label,
  description,
  className,
  src,
  alt,
  priority,
  sizes,
  fill = false,
  imagePosition,
}: ImagePlaceholderProps) {
  const sizing = fill ? "absolute inset-0" : "relative";
  const style = fill ? undefined : { aspectRatio };

  if (src) {
    return (
      <div className={cn(sizing, "overflow-hidden", className)} style={style}>
        <Image
          src={src}
          alt={alt ?? label}
          fill
          priority={priority}
          sizes={sizes ?? "100vw"}
          className={cn("object-cover", imagePosition)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        sizing,
        "flex flex-col items-center justify-center gap-3 overflow-hidden border border-dashed border-white/15 bg-[linear-gradient(135deg,var(--color-ink-800),var(--color-ink-900))] px-6 text-center",
        className,
      )}
      style={style}
      role="img"
      aria-label={`${label} — placeholder`}
    >
      <ImageIcon className="size-7 text-ink-300" aria-hidden />
      <div className="max-w-[32ch] space-y-1">
        <p className="text-sm font-semibold text-ink-100">{label}</p>
        {description ? <p className="text-xs text-ink-200">{description}</p> : null}
        {aspectRatio ? (
          <p className="text-[11px] uppercase tracking-wider text-ink-300">{aspectRatio}</p>
        ) : null}
      </div>
    </div>
  );
}
