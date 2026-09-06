"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import type { SalesMethodContent } from "@/lib/content/schemas";
import { useAuth } from "@/lib/hooks/use-auth";
import { useOverallProgress } from "@/lib/hooks/use-overall-progress";
import { progressRepository } from "@/lib/repositories/progress.repository";
import { FullScreenLoader } from "@/components/shared/FullScreenLoader";
import { StepShell } from "@/components/sales-method/StepShell";
import { CompletionScreen } from "@/components/sales-method/CompletionScreen";
import { MindsetStep } from "@/components/sales-method/steps/MindsetStep";
import { CustomerStep } from "@/components/sales-method/steps/CustomerStep";
import { TracksOverviewStep } from "@/components/sales-method/steps/TracksOverviewStep";
import { TrackCarouselStep } from "@/components/sales-method/steps/TrackCarouselStep";
import { MatchingStep } from "@/components/sales-method/steps/MatchingStep";
import { CallTimelineStep } from "@/components/sales-method/steps/CallTimelineStep";
import { TrustStep } from "@/components/sales-method/steps/TrustStep";
import { DiagnosticStep } from "@/components/sales-method/steps/DiagnosticStep";
import { MentalityStep } from "@/components/sales-method/steps/MentalityStep";

/** Renders the step whose visual layout matches its content `kind`. */
function StepBody({ step }: { step: SalesMethodContent["steps"][number] }) {
  switch (step.kind) {
    case "mindset":
      return <MindsetStep step={step} />;
    case "customer":
      return <CustomerStep step={step} />;
    case "tracksOverview":
      return <TracksOverviewStep step={step} />;
    case "trackCarousel":
      return <TrackCarouselStep step={step} />;
    case "matching":
      return <MatchingStep step={step} />;
    case "callTimeline":
      return <CallTimelineStep step={step} />;
    case "trust":
      return <TrustStep step={step} />;
    case "diagnostic":
      return <DiagnosticStep step={step} />;
    case "mentality":
      return <MentalityStep step={step} />;
  }
}

export function SalesMethodExperience({ content }: { content: SalesMethodContent }) {
  const { user } = useAuth();
  const router = useRouter();
  const { progress: overall, loading } = useOverallProgress(user?.id);

  const totalSteps = content.steps.length;
  // No local "index" state to sync from `overall` via an effect - the resume
  // position is derived straight from progress data on every render, and a
  // manual override (once the rep actually navigates) takes precedence.
  const [manualIndex, setManualIndex] = useState<number | null>(null);
  const [manualCompletion, setManualCompletion] = useState<boolean | null>(null);
  const [finishing, setFinishing] = useState(false);

  if (!user || loading || !overall) {
    return <FullScreenLoader />;
  }

  const resumeIndex = Math.min(overall.salesMethodStep, totalSteps - 1);
  const index = manualIndex ?? resumeIndex;
  const showCompletion = manualCompletion ?? overall.salesMethodCompleted;

  async function goToStep(next: number) {
    if (user) {
      await progressRepository.saveSalesMethodStep(user.id, next);
    }
    setManualIndex(next);
  }

  function handleNext() {
    if (index >= totalSteps - 1) {
      setManualCompletion(true);
      return;
    }
    goToStep(index + 1);
  }

  function handlePrev() {
    if (showCompletion) {
      setManualCompletion(false);
      return;
    }
    if (index > 0) goToStep(index - 1);
  }

  async function handleFinish() {
    setFinishing(true);
    if (user) {
      await progressRepository.markSalesMethodComplete(user.id);
    }
    router.push("/");
  }

  if (showCompletion) {
    return (
      <CompletionScreen
        title={content.completion.title}
        description={content.completion.description}
        buttonLabel={content.completion.buttonLabel}
        onFinish={handleFinish}
        finishing={finishing}
      />
    );
  }

  const step = content.steps[index];

  return (
    <AnimatePresence mode="wait">
      <StepShell
        key={step.id}
        stepNumber={index}
        totalSteps={totalSteps}
        title={step.title}
        description={step.description}
        onNext={handleNext}
        onPrev={index > 0 ? handlePrev : undefined}
        nextLabel={index === totalSteps - 1 ? "לסיום המודול" : "המשך"}
      >
        <StepBody step={step} />
      </StepShell>
    </AnimatePresence>
  );
}
