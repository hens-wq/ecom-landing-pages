"use client";

import { useCallback, useEffect, useState } from "react";
import type { OverallTrainingProgress } from "@/lib/types";
import { progressRepository } from "@/lib/repositories/progress.repository";

export function useOverallProgress(userId: string | undefined) {
  const [progress, setProgress] = useState<OverallTrainingProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!userId) return Promise.resolve(null);
    return progressRepository.getOverallProgress(userId).then((p) => {
      setProgress(p);
      setLoading(false);
      return p;
    });
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { progress, loading, refresh };
}
