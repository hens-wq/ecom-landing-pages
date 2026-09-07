"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useSpring } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

interface TrustMetricProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
  className?: string;
  /** Overrides the tone's default value color, e.g. for a branded accent number. */
  valueClassName?: string;
  /** Overrides the label's default size/weight/color, e.g. to make it more prominent. */
  labelClassName?: string;
  align?: "start" | "center";
  /** `hero` is reserved for a single campaign-hook-scale stat per section. */
  size?: "md" | "lg" | "xl" | "hero";
  tone?: "dark" | "light";
}

const SIZE_CLASS: Record<NonNullable<TrustMetricProps["size"]>, string> = {
  md: "text-display-md",
  lg: "text-display-lg",
  xl: "text-display-xl",
  hero: "text-display-3xl",
};

const TONE_CLASS: Record<NonNullable<TrustMetricProps["tone"]>, { value: string; label: string }> = {
  dark: { value: "text-off-white", label: "text-ink-200" },
  light: { value: "text-ink-950", label: "text-ink-950" },
};

/**
 * A single count-up statistic. Compose several in a flex/grid wrapper at
 * the call site — kept deliberately layout-agnostic so it can sit in a
 * row, a sidebar, or beside imagery rather than only inside a fixed grid.
 */
export function TrustMetric({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  label,
  className,
  valueClassName,
  labelClassName,
  align = "start",
  size = "md",
  tone = "dark",
}: TrustMetricProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });
  const prefersReducedMotion = usePrefersReducedMotion();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { damping: 28, stiffness: 90 });
  const [display, setDisplay] = useState((0).toFixed(decimals));

  useEffect(() => {
    if (!isInView || prefersReducedMotion) return;
    motionValue.set(value);
  }, [isInView, value, motionValue, prefersReducedMotion]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (latest) => {
      setDisplay(latest.toFixed(decimals));
    });
    return unsubscribe;
  }, [spring, decimals]);

  return (
    <div className={cn("flex flex-col", align === "center" && "items-center text-center", className)}>
      <span
        ref={ref}
        className={cn(SIZE_CLASS[size], TONE_CLASS[tone].value, "bidi-plaintext", valueClassName)}
      >
        {prefix}
        {prefersReducedMotion ? value.toFixed(decimals) : display}
        {suffix}
      </span>
      <span className={cn("mt-1.5 text-base font-medium", TONE_CLASS[tone].label, labelClassName)}>
        {label}
      </span>
    </div>
  );
}
