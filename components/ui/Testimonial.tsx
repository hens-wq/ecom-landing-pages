import { Quote } from "lucide-react";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { cn } from "@/lib/utils";

interface TestimonialProps {
  quote: string;
  name: string;
  role: string;
  avatarSrc?: string;
  variant?: "card" | "minimal";
  className?: string;
}

export function Testimonial({
  quote,
  name,
  role,
  avatarSrc,
  variant = "card",
  className,
}: TestimonialProps) {
  if (variant === "minimal") {
    return (
      <figure className={cn("max-w-prose", className)}>
        <blockquote className="text-display-sm text-balance text-off-white">
          &rdquo;{quote}&ldquo;
        </blockquote>
        <figcaption className="mt-4 flex items-center gap-3">
          <ImagePlaceholder
            aspectRatio="1/1"
            label={`תמונת פרופיל — ${name}`}
            src={avatarSrc}
            className="size-10 shrink-0 rounded-full"
          />
          <span className="text-sm text-ink-200">
            <span className="font-semibold text-off-white">{name}</span>
            <span className="mx-1.5 text-ink-500">·</span>
            {role}
          </span>
        </figcaption>
      </figure>
    );
  }

  return (
    <figure
      className={cn(
        "flex flex-col gap-5 border border-white/10 bg-ink-800/60 p-6 backdrop-blur-sm sm:p-8",
        className,
      )}
    >
      <Quote className="size-6 text-brand-400" aria-hidden />
      <blockquote className="text-balance text-[17px] leading-relaxed text-ink-100">
        {quote}
      </blockquote>
      <figcaption className="mt-auto flex items-center gap-3 pt-2">
        <ImagePlaceholder
          aspectRatio="1/1"
          label={`תמונת פרופיל — ${name}`}
          src={avatarSrc}
          className="size-11 shrink-0 rounded-full"
        />
        <span className="text-sm">
          <span className="block font-semibold text-off-white">{name}</span>
          <span className="block text-ink-200">{role}</span>
        </span>
      </figcaption>
    </figure>
  );
}
