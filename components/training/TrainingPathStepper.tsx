import type { TrainingStep } from "@/lib/types";
import type { StepStatusInfo } from "@/lib/training-path";
import { StepCircle, TrainingStepCard } from "@/components/training/TrainingStepCard";

export function TrainingPathStepper({
  steps,
  statuses,
}: {
  steps: TrainingStep[];
  statuses: Record<string, StepStatusInfo>;
}) {
  return (
    <div className="flex flex-col">
      {steps.map((step, i) => {
        const info = statuses[step.id] ?? { status: "locked" as const, percent: 0 };
        return (
          <div key={step.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <StepCircle status={info.status} icon={step.icon} />
              {i < steps.length - 1 && <div className="my-1 w-px flex-1 bg-slate-200" />}
            </div>
            <div className="flex-1 pb-6">
              <TrainingStepCard step={step} status={info.status} percent={info.percent} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
