"use client";

import type { TrainingPathContent } from "@/lib/content/schemas";
import { useAuth } from "@/lib/hooks/use-auth";
import { useOverallProgress } from "@/lib/hooks/use-overall-progress";
import { useAllCourseProgress } from "@/lib/hooks/use-all-course-progress";
import { computeStepStatuses } from "@/lib/training-path";
import { PageHeader } from "@/components/shared/PageHeader";
import { TrainingPathStepper } from "@/components/training/TrainingPathStepper";
import { FullScreenLoader } from "@/components/shared/FullScreenLoader";

export function TrainingPathScreen({ content }: { content: TrainingPathContent }) {
  const { user } = useAuth();
  const { progress: overall, loading: overallLoading } = useOverallProgress(user?.id);
  const { progress: courseProgresses, loading: coursesLoading } = useAllCourseProgress(user?.id);

  if (!user || overallLoading || coursesLoading || !overall || !courseProgresses) {
    return <FullScreenLoader />;
  }

  const statuses = computeStepStatuses(overall, courseProgresses);

  return (
    <div className="flex flex-col gap-8 pb-10">
      <PageHeader
        crumbs={[{ label: "בית", href: "/" }, { label: "מסלול ההכשרה שלי" }]}
        title={content.title}
        description={content.description}
      />
      <div className="max-w-2xl">
        <TrainingPathStepper steps={content.steps} statuses={statuses} />
      </div>
    </div>
  );
}
