import Image from "next/image";
import { Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface InstitutionMarkProps {
  name: string;
  subtitle?: string;
  src?: string;
  alt?: string;
  className?: string;
}

/**
 * A partner/institution credibility mark. Without `src` it renders a
 * clean wordmark badge (name + subtitle) instead of a dashed-border
 * "missing image" placeholder — reads as an intentional design choice,
 * not an unfinished section. Once the official logo asset exists, pass
 * `src` and this becomes a proper logo lockup on a light card (most
 * institutional logos assume a white/light background) — same slot, no
 * other changes needed.
 */
export function InstitutionMark({ name, subtitle, src, alt, className }: InstitutionMarkProps) {
  if (src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-white px-6 py-5 shadow-[0_1px_0_rgba(0,0,0,0.04)]",
          className,
        )}
      >
        <div className="relative h-12 w-full">
          <Image src={src} alt={alt ?? name} fill sizes="260px" className="object-contain" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-7 py-7 text-center",
        className,
      )}
    >
      <Landmark className="size-5 text-teal-300" aria-hidden />
      <p className="text-sm font-semibold tracking-wide text-off-white">{name}</p>
      {subtitle ? <p className="text-[15px] text-ink-200">{subtitle}</p> : null}
    </div>
  );
}
