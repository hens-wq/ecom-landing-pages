"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const BASE_VOLUME = 0.16;
const DUCKED_VOLUME = 0.03;
const FADE_MS = 400;

interface IntroAudioContextValue {
  /** Starts playback. Safe to call repeatedly; must follow a user gesture (browser autoplay policy). */
  play: () => void;
  /** Fades the track down (e.g. while an alumni video is playing). */
  duck: () => void;
  /** Fades the track back up to its normal background level. */
  unduck: () => void;
  toggleMute: () => void;
  muted: boolean;
  /** False when no audio.json src is configured - callers should hide music UI entirely. */
  hasTrack: boolean;
}

const IntroAudioContext = createContext<IntroAudioContextValue | null>(null);

function fadeTo(audio: HTMLAudioElement, target: number) {
  const start = audio.volume;
  const startTime = performance.now();
  function step(now: number) {
    const t = Math.min(1, (now - startTime) / FADE_MS);
    audio.volume = start + (target - start) * t;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/**
 * Optional background-music infrastructure for the Ecom intro experience.
 * Entirely inert when `src` is null (no track configured yet) - every method
 * becomes a safe no-op so nothing breaks before a real audio file is added
 * to content/site/ecom-intro/audio.json.
 */
export function IntroAudioProvider({ src, children }: { src: string | null; children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!src) return;
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = BASE_VOLUME;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [src]);

  const play = useCallback(() => {
    if (!audioRef.current || muted) return;
    audioRef.current.play().catch(() => {
      // Autoplay was blocked (no user gesture yet) - safe to ignore, the
      // rep can still use the visible mute/unmute control once it's shown.
    });
  }, [muted]);

  const duck = useCallback(() => {
    if (!audioRef.current) return;
    fadeTo(audioRef.current, DUCKED_VOLUME);
  }, []);

  const unduck = useCallback(() => {
    if (!audioRef.current) return;
    fadeTo(audioRef.current, BASE_VOLUME);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      const audio = audioRef.current;
      if (audio) {
        if (next) audio.pause();
        else audio.play().catch(() => {});
      }
      return next;
    });
  }, []);

  return (
    <IntroAudioContext.Provider value={{ play, duck, unduck, toggleMute, muted, hasTrack: !!src }}>
      {children}
    </IntroAudioContext.Provider>
  );
}

export function useIntroAudio() {
  const ctx = useContext(IntroAudioContext);
  if (!ctx) throw new Error("useIntroAudio must be used within an IntroAudioProvider");
  return ctx;
}
