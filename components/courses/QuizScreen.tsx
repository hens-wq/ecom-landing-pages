"use client";

import { useState } from "react";
import type { Course } from "@/lib/types";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCourseProgress } from "@/lib/hooks/use-course-progress";
import { scoreQuiz } from "@/lib/quiz";
import { CourseThemeProvider } from "@/components/courses/CourseThemeProvider";
import { Breadcrumbs } from "@/components/shared/PageHeader";
import { QuizEngine } from "@/components/courses/QuizEngine";
import { QuizResult } from "@/components/courses/QuizResult";
import { FullScreenLoader } from "@/components/shared/FullScreenLoader";

interface AttemptView {
  answers: Record<string, string>;
  score: number;
  passed: boolean;
  bestScore: number;
  attemptsCount: number;
}

export function QuizScreen({ course }: { course: Course }) {
  const { user } = useAuth();
  const { progress, loading, submitQuiz } = useCourseProgress(user?.id, course.meta.slug);
  const [attemptView, setAttemptView] = useState<AttemptView | null>(null);
  const [engineKey, setEngineKey] = useState(0);

  if (!user || loading || !progress) {
    return <FullScreenLoader />;
  }

  const quiz = course.quiz;

  async function handleFinish(answers: Record<string, string>) {
    const score = scoreQuiz(quiz, answers);
    const updated = await submitQuiz(answers, score, quiz.passScore);
    setAttemptView({
      answers,
      score,
      passed: score >= quiz.passScore,
      bestScore: updated?.bestScore ?? score,
      attemptsCount: updated?.attempts.length ?? 1,
    });
  }

  function handleRetry() {
    setAttemptView(null);
    setEngineKey((k) => k + 1);
  }

  return (
    <CourseThemeProvider theme={course.theme}>
      <div className="flex flex-col gap-6 pb-16">
        <Breadcrumbs
          items={[
            { label: "בית", href: "/" },
            { label: "הקורסים", href: "/courses" },
            { label: course.meta.title, href: `/courses/${course.meta.slug}` },
            { label: "מבחן ידע" },
          ]}
        />

        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--course-text-accent)]">
            מבחן ידע - {course.meta.title}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{quiz.title}</h1>
        </div>

        <div className="mx-auto w-full max-w-2xl">
          {attemptView ? (
            <QuizResult
              quiz={quiz}
              answers={attemptView.answers}
              score={attemptView.score}
              passed={attemptView.passed}
              bestScore={attemptView.bestScore}
              attemptsCount={attemptView.attemptsCount}
              onRetry={handleRetry}
              continueHref={`/courses/${course.meta.slug}/complete`}
            />
          ) : (
            <QuizEngine key={engineKey} quiz={quiz} onFinish={handleFinish} />
          )}
        </div>
      </div>
    </CourseThemeProvider>
  );
}
