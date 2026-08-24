"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * SSR-safe prefers-reduced-motion detection. Always resolves `false` on
 * the very first client render (matching the server, which has no
 * `window`) and only switches after mount — motion/react's own
 * `useReducedMotion` reads `matchMedia` synchronously on the client's
 * first render, which is *before* server output, causing a hydration
 * mismatch whenever the visitor's OS actually has reduced motion on.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(QUERY);
    // Reads the real value post-mount on purpose — matching it during SSR/
    // hydration is exactly the mismatch this hook exists to avoid.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return reduced;
}
