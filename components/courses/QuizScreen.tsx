"use client";

import { useEffect, useState } from "react";
import type { Course, QuizDraft, QuizOpenAnswerRecord } from "@/lib/types";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCourseProgress } from "@/lib/hooks/use-course-progress";
import { isMultipleChoice, isOpenText, openTextFullPrompt, scoreMultipleChoice, totalPossiblePoints } from "@/lib/quiz";
import { CourseThemeProvider } from "@/components/courses/CourseThemeProvider";
import { Breadcrumbs } from "@/components/shared/PageHeader";
import { QuizIntro } from "@/components/courses/QuizIntro";
import { QuizEngine, type QuizEngineResult } from "@/components/courses/QuizEngine";
import { QuizResult } from "@/components/courses/QuizResult";
import { ReturnToMaterialsMenu } from "@/components/courses/ReturnToMaterialsMenu";
import { FullScreenLoader } from "@/components/shared/FullScreenLoader";

type DraftShape = Pick<QuizDraft, "currentIndex" | "mcqAnswers" | "openAnswers">;

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

  // Once submitted, an attempt is retained for good - reopening the exam
  // (or just having finished one) must show its existing pending/graded
  // state, never a fresh intro that could look like a second attempt is
  // starting (Task 4D: no rep-facing retry). `progress` is the single
  // source of truth here, so this is derived on every render rather than
  // synced into local state.
  const lastAttempt = progress.attempts[progress.attempts.length - 1];
  const effectivePhase: Phase = lastAttempt ? "result" : phase;

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

    await submitQuiz({
      mcqAnswers: result.mcqAnswers,
      openAnswers,
      pointsEarned,
      pointsAutoMax,
      pointsTotalPossible: totalPossiblePoints(quiz),
      passScore: quiz.passScore,
    });

    // Fire-and-forget: hands the submission to the server-side review
    // pipeline (AI evaluation recommendation + review email, Task 4E/4F).
    // The attempt above is already persisted, so a failure here must never
    // surface as an error to the rep or affect what they just submitted.
    const openQuestion = quiz.questions.find(isOpenText);
    if (openQuestion) {
      const mcqRows = quiz.questions.filter(isMultipleChoice).map((q) => {
        const selectedId = result.mcqAnswers[q.id];
        const selectedOption = q.options.find((o) => o.id === selectedId);
        const correctOption = q.options.find((o) => o.id === q.correctOptionId);
        return {
          question: q.question,
          selectedAnswer: selectedOption?.text ?? "לא נענתה",
          correctAnswer: correctOption?.text ?? "",
          isCorrect: selectedId === q.correctOptionId,
          points: q.points,
        };
      });

      fetch("/api/quiz/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseSlug: course.meta.slug,
          quizTitle: quiz.title,
          repName: user?.name ?? "",
          submittedAt: new Date().toISOString(),
          mcqRows,
          mcqScore: pointsEarned,
          mcqScoreMax: pointsAutoMax,
          openQuestionPrompt: openTextFullPrompt(openQuestion),
          openAnswerText: result.openAnswers[openQuestion.id] ?? "",
          rubric: openQuestion.rubric,
        }),
      }).catch((err) => {
        console.warn("[quiz-review] failed to notify review pipeline (attempt already saved)", err);
      });
    }

    // submitQuiz already refreshed `progress` - the newly submitted attempt
    // now shows up as `lastAttempt` above and effectivePhase switches to
    // "result" on its own; no local view state to set here.
    setDraft(null);
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
          {effectivePhase !== "result" && <ReturnToMaterialsMenu courseSlug={course.meta.slug} />}
        </div>

        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--course-text-accent)]">
            מבחן ידע - {course.meta.title}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{quiz.title}</h1>
        </div>

        <div className="mx-auto w-full max-w-2xl">
          {effectivePhase === "intro" && (
            <QuizIntro
              quiz={quiz}
              courseName={course.meta.title}
              resuming={false}
              onStart={() => setPhase("in-progress")}
            />
          )}

          {effectivePhase === "in-progress" && (
            <QuizEngine
              quiz={quiz}
              initialDraft={draft}
              closingNote={closingNote}
              onDraftChange={handleDraftChange}
              onFinish={handleFinish}
            />
          )}

          {effectivePhase === "result" && lastAttempt && (
            <QuizResult
              quiz={quiz}
              mcqAnswers={lastAttempt.mcqAnswers}
              openAnswers={lastAttempt.openAnswers}
              pointsEarned={lastAttempt.pointsEarned}
              pointsAutoMax={lastAttempt.pointsAutoMax}
              pointsTotalPossible={lastAttempt.pointsTotalPossible}
              evaluationStatus={lastAttempt.evaluationStatus}
              score={lastAttempt.score}
              passed={lastAttempt.passed}
              bestScore={progress.bestScore}
              attemptsCount={progress.attempts.length}
              continueHref={`/courses/${course.meta.slug}/complete`}
            />
          )}
        </div>
      </div>
    </CourseThemeProvider>
  );
}
