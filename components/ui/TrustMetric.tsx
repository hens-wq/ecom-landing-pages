"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

interface TrustMetricProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
  className?: string;
  align?: "start" | "center";
}

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
  align = "start",
}: TrustMetricProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });
  const prefersReducedMotion = useReducedMotion();
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
      <span ref={ref} className="text-display-md text-off-white bidi-plaintext">
        {prefix}
        {prefersReducedMotion ? value.toFixed(decimals) : display}
        {suffix}
      </span>
      <span className="mt-1 text-sm text-ink-300">{label}</span>
    </div>
  );
}
