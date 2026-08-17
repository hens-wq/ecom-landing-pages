"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useIntroAudio } from "@/components/ecom-intro/audio/IntroAudioProvider";
import { cn } from "@/lib/utils";

export function MusicToggle({ className }: { className?: string }) {
  const { hasTrack, muted, toggleMute } = useIntroAudio();
  if (!hasTrack) return null;

  return (
    <button
      type="button"
      onClick={toggleMute}
      aria-label={muted ? "הפעלת מוזיקת רקע" : "השתקת מוזיקת רקע"}
      aria-pressed={!muted}
      className={cn(
        "flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 shadow-sm backdrop-blur-sm transition-colors hover:text-[var(--brand-purple)]",
        className
      )}
    >
      {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
    </button>
  );
}
