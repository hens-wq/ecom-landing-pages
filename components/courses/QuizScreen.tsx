"use client";

import { useEffect, useState } from "react";
import type { Course, QuizDraft, QuizOpenAnswerRecord } from "@/lib/types";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCourseProgress } from "@/lib/hooks/use-course-progress";
import { isOpenText, scoreMultipleChoice, totalPossiblePoints } from "@/lib/quiz";
import { CourseThemeProvider } from "@/components/courses/CourseThemeProvider";
import { Breadcrumbs } from "@/components/shared/PageHeader";
import { QuizIntro } from "@/components/courses/QuizIntro";
import { QuizEngine, type QuizEngineResult } from "@/components/courses/QuizEngine";
import { QuizResult } from "@/components/courses/QuizResult";
import { ReturnToMaterialsMenu } from "@/components/courses/ReturnToMaterialsMenu";
import { FullScreenLoader } from "@/components/shared/FullScreenLoader";

type DraftShape = Pick<QuizDraft, "currentIndex" | "mcqAnswers" | "openAnswers">;

interface AttemptView {
  mcqAnswers: Record<string, string>;
  openAnswersText: Record<string, string>;
  pointsEarned: number;
  pointsAutoMax: number;
  passed: boolean;
  bestScore: number;
  attemptsCount: number;
}

type Phase = "intro" | "in-progress" | "result";

function hasMeaningfulProgress(draft: DraftShape) {
  return (
    draft.currentIndex > 0 ||
    Object.keys(draft.mcqAnswers).length > 0 ||
    Object.keys(draft.openAnswers).length > 0
  );
}

export function QuizScreen({ course }: { course: Course }) {
  const { user } = useAuth();
  const { progress, loading, submitQuiz, getQuizDraft, saveQuizDraft } = useCourseProgress(
    user?.id,
    course.meta.slug
  );

  const [phase, setPhase] = useState<Phase>("intro");
  const [draft, setDraft] = useState<DraftShape | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [attemptView, setAttemptView] = useState<AttemptView | null>(null);
  const [engineKey, setEngineKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    getQuizDraft().then((saved) => {
      if (saved && hasMeaningfulProgress(saved)) {
        setDraft(saved);
        setPhase("in-progress");
      }
      setDraftLoaded(true);
    });
    // Only reload the draft when the signed-in user or course changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, course.meta.slug]);

  if (!user || loading || !progress || !draftLoaded) {
    return <FullScreenLoader />;
  }

  const quiz = course.quiz;

  function handleDraftChange(next: QuizEngineResult & { currentIndex: number }) {
    saveQuizDraft({ ...next, updatedAt: new Date().toISOString() });
  }

  async function handleFinish(result: QuizEngineResult) {
    const { pointsEarned, pointsAutoMax } = scoreMultipleChoice(quiz, result.mcqAnswers);
    const openAnswers: QuizOpenAnswerRecord[] = quiz.questions.filter(isOpenText).map((q) => ({
      questionId: q.id,
      answerText: result.openAnswers[q.id] ?? "",
      points: q.points,
      rubric: q.rubric,
      status: "pending" as const,
    }));

    const updated = await submitQuiz({
      mcqAnswers: result.mcqAnswers,
      openAnswers,
      pointsEarned,
      pointsAutoMax,
      pointsTotalPossible: totalPossiblePoints(quiz),
      passScore: quiz.passScore,
    });

    const percent = pointsAutoMax > 0 ? Math.round((pointsEarned / pointsAutoMax) * 100) : 0;
    setAttemptView({
      mcqAnswers: result.mcqAnswers,
      openAnswersText: result.openAnswers,
      pointsEarned,
      pointsAutoMax,
      passed: percent >= quiz.passScore,
      bestScore: updated?.bestScore ?? percent,
      attemptsCount: updated?.attempts.length ?? 1,
    });
    setDraft(null);
    setPhase("result");
  }

  function handleRetry() {
    setAttemptView(null);
    setDraft(null);
    setEngineKey((k) => k + 1);
    setPhase("in-progress");
  }

  const closingNote = quiz.closingNote.replace(/\{\{courseName\}\}/g, course.meta.title);

  return (
    <CourseThemeProvider theme={course.theme}>
      <div className="flex flex-col gap-6 pb-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumbs
            items={[
              { label: "בית", href: "/" },
              { label: "הקורסים", href: "/courses" },
              { label: course.meta.title, href: `/courses/${course.meta.slug}` },
              { label: "מבחן ידע" },
            ]}
          />
          {phase !== "result" && <ReturnToMaterialsMenu courseSlug={course.meta.slug} />}
        </div>

        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--course-text-accent)]">
            מבחן ידע - {course.meta.title}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{quiz.title}</h1>
        </div>

        <div className="mx-auto w-full max-w-2xl">
          {phase === "intro" && (
            <QuizIntro
              quiz={quiz}
              courseName={course.meta.title}
              resuming={false}
              onStart={() => setPhase("in-progress")}
            />
          )}

          {phase === "in-progress" && (
            <QuizEngine
              key={engineKey}
              quiz={quiz}
              initialDraft={draft}
              closingNote={closingNote}
              onDraftChange={handleDraftChange}
              onFinish={handleFinish}
            />
          )}

          {phase === "result" && attemptView && (
            <QuizResult
              quiz={quiz}
              mcqAnswers={attemptView.mcqAnswers}
              openAnswersText={attemptView.openAnswersText}
              pointsEarned={attemptView.pointsEarned}
              pointsAutoMax={attemptView.pointsAutoMax}
              passed={attemptView.passed}
              bestScore={attemptView.bestScore}
              attemptsCount={attemptView.attemptsCount}
              onRetry={handleRetry}
              continueHref={`/courses/${course.meta.slug}/complete`}
            />
          )}
        </div>
      </div>
    </CourseThemeProvider>
  );
}
