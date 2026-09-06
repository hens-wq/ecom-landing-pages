"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemedAccentBackground } from "@/components/shared/GeometricDecor";

export function CompletionScreen({
  title,
  description,
  buttonLabel,
  onFinish,
  finishing,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onFinish: () => void;
  finishing: boolean;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-6 py-16 sm:px-10">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--brand-purple)] to-[#3b1573] px-6 py-14 text-center text-white sm:px-12 sm:py-20">
        <ThemedAccentBackground wedgeCorner="bottom-left" className="opacity-40" />
        <div className="relative mx-auto flex max-w-lg flex-col items-center gap-4">
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="leading-relaxed text-white/70">{description}</p>
          <Button
            onClick={onFinish}
            disabled={finishing}
            size="lg"
            className="mt-2 bg-white text-[var(--brand-purple)] hover:bg-white/90"
          >
            {buttonLabel}
            <ArrowLeft className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
