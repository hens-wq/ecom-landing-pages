"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SectionNav({
  onPrev,
  onNext,
  nextLabel = "המשך",
  nextSize = "lg",
  className,
}: {
  onPrev?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextSize?: "default" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("flex w-full items-center justify-center gap-3", className)}>
      {onPrev && (
        <Button type="button" variant="ghost" onClick={onPrev}>
          <ArrowRight className="size-4" />
          חזרה
        </Button>
      )}
      <Button type="button" size={nextSize} onClick={onNext}>
        {nextLabel}
        <ArrowLeft className="size-4" />
      </Button>
    </div>
  );
}
