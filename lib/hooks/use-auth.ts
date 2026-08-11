"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@/lib/types";
import { authRepository } from "@/lib/repositories/auth.repository";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    return authRepository.getCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
      return u;
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user, loading, refresh };
}
