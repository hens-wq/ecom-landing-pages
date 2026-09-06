import type { SalesMethodStep } from "@/lib/content/schemas";
import { NumberedCard } from "@/components/sales-method/parts";

type MindsetStepData = Extract<SalesMethodStep, { kind: "mindset" }>;

export function MindsetStep({ step }: { step: MindsetStepData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {step.principles.map((p) => (
        <NumberedCard key={p.number} number={p.number} title={p.title} description={p.description} />
      ))}
    </div>
  );
}
