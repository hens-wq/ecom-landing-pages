"use client";

import { useCallback, useEffect, useState } from "react";
import type { CourseProgress, CourseSlug, QuizDraft } from "@/lib/types";
import {
  progressRepository,
  type SubmitQuizAttemptInput,
} from "@/lib/repositories/progress.repository";

export function useCourseProgress(userId: string | undefined, slug: CourseSlug) {
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!userId) return Promise.resolve(null);
    return progressRepository.getCourseProgress(userId, slug).then((p) => {
      setProgress(p);
      setLoading(false);
      return p;
    });
  }, [userId, slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markTopicComplete = useCallback(
    async (topicId: string) => {
      if (!userId) return;
      await progressRepository.markTopicComplete(userId, slug, topicId);
      await refresh();
    },
    [userId, slug, refresh]
  );

  const markVideoWatched = useCallback(async () => {
    if (!userId) return;
    await progressRepository.markVideoWatched(userId, slug);
    await refresh();
  }, [userId, slug, refresh]);

  const submitQuiz = useCallback(
    async (input: SubmitQuizAttemptInput) => {
      if (!userId) return null;
      const result = await progressRepository.submitQuizAttempt(userId, slug, input);
      await refresh();
      return result;
    },
    [userId, slug, refresh]
  );

  const getQuizDraft = useCallback((): Promise<QuizDraft | null> => {
    if (!userId) return Promise.resolve(null);
    return progressRepository.getQuizDraft(userId, slug);
  }, [userId, slug]);

  const saveQuizDraft = useCallback(
    (draft: QuizDraft) => {
      if (!userId) return Promise.resolve();
      return progressRepository.saveQuizDraft(userId, slug, draft);
    },
    [userId, slug]
  );

  const clearQuizDraft = useCallback(() => {
    if (!userId) return Promise.resolve();
    return progressRepository.clearQuizDraft(userId, slug);
  }, [userId, slug]);

  return {
    progress,
    loading,
    refresh,
    markTopicComplete,
    markVideoWatched,
    submitQuiz,
    getQuizDraft,
    saveQuizDraft,
    clearQuizDraft,
  };
}
