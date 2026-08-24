"use client";

import { useEffect, useState } from "react";
import { captureAndPersistUtmParams } from "@/lib/tracking/utm";
import type { LandingPageId, TrackingContext } from "@/lib/types";

const EMPTY_UTM = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
  fbclid: null,
  gclid: null,
} as const;

/**
 * Resolves the current visit's tracking context (UTM/click-ids + page URL)
 * for a given landing page. Runs client-side only, since it reads
 * location/sessionStorage — server-rendered markup has no tracking values.
 */
export function useTrackingContext(landingPageId: LandingPageId): TrackingContext {
  const [tracking, setTracking] = useState<TrackingContext>({
    pageUrl: "",
    landingPageId,
    ...EMPTY_UTM,
  });

  useEffect(() => {
    // Reads window.location/sessionStorage, which don't exist during SSR —
    // this has to run post-mount, it isn't state derivable from props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTracking({
      pageUrl: window.location.href,
      landingPageId,
      ...captureAndPersistUtmParams(),
    });
  }, [landingPageId]);

  return tracking;
}
