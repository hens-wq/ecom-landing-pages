"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SalesMethodStep } from "@/lib/content/schemas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TrackCarouselStepData = Extract<SalesMethodStep, { kind: "trackCarousel" }>;

/**
 * Internal mini-carousel for the 7 study tracks - local state only, fully
 * independent of the module's main step navigation (browsing tracks here
 * never advances or rewinds the 9-step progress).
 */
export function TrackCarouselStep({ step }: { step: TrackCarouselStepData }) {
  const [index, setIndex] = useState(0);
  const tracks = step.tracks;
  const track = tracks[index];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {tracks.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setIndex(i)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              i === index
                ? "border-[var(--brand-purple)] bg-[var(--brand-purple)]/10 text-[var(--brand-purple)]"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            )}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={track.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-3"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-purple)]">
              {track.name} · קורס {track.courseNumber} מתוך {track.totalCourses}
            </span>
            <h3 className="text-lg font-bold text-slate-900 sm:text-xl">{track.headline}</h3>
            <div className="flex flex-wrap gap-1.5 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-2.5 py-1">כניסה {track.salary.entry}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1">אחרי ניסיון {track.salary.afterExperience}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1">מתקדם {track.salary.advanced}</span>
            </div>
            {track.whatItIs && <p className="text-sm leading-relaxed text-slate-600">{track.whatItIs}</p>}
            <p className="text-sm leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-700">למי זה מתאים: </span>
              {track.whoItSuits}
            </p>
            {track.rolesAfter && (
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-slate-500">תפקידים לאחר ההכשרה: </span>
                {track.rolesAfter}
              </p>
            )}
            {track.pendingNote && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700">{track.pendingNote}</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          <ChevronRight className="size-4" />
          מסלול קודם
        </Button>
        <span className="text-xs font-medium text-slate-400">
          מסלול {index + 1} מתוך {tracks.length}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={index === tracks.length - 1}
          onClick={() => setIndex((i) => Math.min(tracks.length - 1, i + 1))}
        >
          מסלול הבא
          <ChevronLeft className="size-4" />
        </Button>
      </div>
    </div>
  );
}
