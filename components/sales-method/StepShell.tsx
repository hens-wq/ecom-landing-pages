"use client";

import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemedAccentBackground } from "@/components/shared/GeometricDecor";
import { cn } from "@/lib/utils";

/** "שלב X מתוך Y" + thin progress bar - the one piece of chrome every step shares. */
function StepIndicator({ current, total }: { current: number; total: number }) {
  const percent = Math.round(((current + 1) / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="whitespace-nowrap text-xs font-semibold text-slate-500">
        שלב {current + 1} מתוך {total}
      </span>
      <div className="flex h-1 w-28 overflow-hidden rounded-full bg-slate-200 sm:w-40">
        <div
          className="h-full rounded-full bg-[var(--brand-purple)] transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Common full-screen chrome for one Sales Method step: kicker/progress,
 * title + optional description, a content slot each step fills with its
 * own distinct layout, and the המשך/חזרה row. Deliberately separate from
 * components/ecom-intro's IntroExperience shell (adapted, not shared) so
 * this module can evolve on its own without touching the Intro flow.
 */
export function StepShell({
  stepNumber,
  totalSteps,
  title,
  description,
  onNext,
  onPrev,
  nextLabel = "המשך",
  nextDisabled,
  children,
}: {
  stepNumber: number;
  totalSteps: number;
  title: string;
  description?: string;
  onNext: () => void;
  onPrev?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  children: ReactNode;
}) {
  // Each step remounts this shell (key={step.id} at the call site), so a
  // fresh mount is exactly the right moment to reset scroll - otherwise a
  // shorter step can render with the previous, taller step's scroll offset
  // still applied, cutting off its own title.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden px-4 py-8 sm:px-8 sm:py-10">
      <ThemedAccentBackground wedgeCorner="top-right" className="opacity-60" />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
        <StepIndicator current={stepNumber} total={totalSteps} />

        <motion.div
          key={stepNumber}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-1 flex-col gap-6"
        >
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
            {description && <p className="max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">{description}</p>}
          </div>

          <div className="flex-1">{children}</div>
        </motion.div>

        <div className={cn("flex items-center gap-3 pt-2", onPrev ? "justify-between" : "justify-end")}>
          {onPrev && (
            <Button type="button" variant="ghost" onClick={onPrev}>
              <ArrowRight className="size-4" />
              חזרה
            </Button>
          )}
          <Button type="button" onClick={onNext} disabled={nextDisabled} size="lg">
            {nextLabel}
            <ArrowLeft className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
