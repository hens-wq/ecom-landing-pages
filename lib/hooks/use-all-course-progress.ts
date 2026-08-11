"use client";

import { useCallback, useEffect, useState } from "react";
import { COURSE_SLUGS } from "@/lib/courses";
import type { CourseProgress, CourseSlug } from "@/lib/types";
import { progressRepository } from "@/lib/repositories/progress.repository";

function fetchAllCourseProgress(userId: string) {
  return Promise.all(
    COURSE_SLUGS.map(
      async (slug) => [slug, await progressRepository.getCourseProgress(userId, slug)] as const
    )
  ).then((entries) => Object.fromEntries(entries) as Record<CourseSlug, CourseProgress>);
}

export function useAllCourseProgress(userId: string | undefined) {
  const [progress, setProgress] = useState<Record<CourseSlug, CourseProgress> | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!userId) return Promise.resolve(null);
    return fetchAllCourseProgress(userId).then((record) => {
      setProgress(record);
      setLoading(false);
      return record;
    });
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { progress, loading, refresh };
}
