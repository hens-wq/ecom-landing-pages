import Image from "next/image";
import { cn } from "@/lib/utils";

interface InstitutionMarkProps {
  name: string;
  subtitle?: string;
  src?: string;
  alt?: string;
  className?: string;
}

/**
 * A partner/institution credibility mark. Without `src` it renders as
 * plain typography only — no icon, no border, no background panel —
 * specifically so it never reads as a stand-in or invented logo. Once
 * the official logo asset exists, pass `src` and this becomes a proper
 * logo lockup on a light card (most institutional logos assume a
 * white/light background) — same slot, no other changes needed.
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
    <div className={cn("flex flex-col items-center gap-1.5 text-center md:items-start md:text-start", className)}>
      <span className="h-px w-8 bg-teal-400/50" aria-hidden />
      <p className="text-lg font-semibold tracking-wide text-off-white">{name}</p>
      {subtitle ? <p className="text-[15px] text-ink-200">{subtitle}</p> : null}
    </div>
  );
}
