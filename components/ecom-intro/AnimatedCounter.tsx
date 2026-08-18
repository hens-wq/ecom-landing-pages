"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";

export function AnimatedCounter({
  value,
  decimals = 0,
  suffix = "",
  delayMs = 0,
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  /** Stagger the count-up start relative to sibling counters (e.g. i * 300). */
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const [display, setDisplay] = useState(formatter.format(0));

  useEffect(() => {
    if (!inView) return;
    let controls: ReturnType<typeof animate> | undefined;
    const timer = setTimeout(() => {
      controls = animate(0, value, {
        duration: 1.4,
        ease: "easeOut",
        onUpdate: (latest) => setDisplay(formatter.format(latest)),
      });
    }, delayMs);
    return () => {
      clearTimeout(timer);
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, decimals, delayMs]);

  return (
    <span ref={ref} className={className}>
      {/* Isolated as LTR so the RTL page context can never reorder the digits and suffix (e.g. "2,500+" flipping to "+2,500"). */}
      <span dir="ltr" style={{ unicodeBidi: "isolate" }}>
        {display}
        {suffix}
      </span>
    </span>
  );
}
