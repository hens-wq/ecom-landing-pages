"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Effect = "fade-up" | "fade-in" | "slide-start" | "slide-end" | "scale-in";
type Tag = "div" | "section" | "article" | "span" | "header" | "li";

interface AnimatedSectionProps {
  children: ReactNode;
  effect?: Effect;
  delay?: number;
  duration?: number;
  className?: string;
  as?: Tag;
  /** Fraction of the element that must enter the viewport before it animates. */
  amount?: number;
}

const EFFECTS: Record<Effect, Variants> = {
  "fade-up": { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0 } },
  "fade-in": { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  "slide-start": { hidden: { opacity: 0, x: -48 }, visible: { opacity: 1, x: 0 } },
  "slide-end": { hidden: { opacity: 0, x: 48 }, visible: { opacity: 1, x: 0 } },
  "scale-in": { hidden: { opacity: 0, scale: 0.94 }, visible: { opacity: 1, scale: 1 } },
};

/**
 * Scroll-triggered reveal wrapper. Each landing page section should pick
 * whichever `effect` suits its content rather than every section reusing
 * the same motion — that repetition is part of what makes AI-built pages
 * feel generic.
 */
export function AnimatedSection({
  children,
  effect = "fade-up",
  delay = 0,
  duration = 0.7,
  className,
  as: Tag = "div",
  amount = 0.3,
}: AnimatedSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const MotionTag = motion[Tag];
  const StaticTag = Tag;

  if (prefersReducedMotion) {
    return <StaticTag className={className}>{children}</StaticTag>;
  }

  return (
    <MotionTag
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={EFFECTS[effect]}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionTag>
  );
}
