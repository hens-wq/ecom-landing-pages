"use client";

import { useRouter } from "next/navigation";
import type { EcomIntroContent } from "@/lib/content/loader";
import { useAuth } from "@/lib/hooks/use-auth";
import { progressRepository } from "@/lib/repositories/progress.repository";
import { IntroExperience } from "@/components/ecom-intro/IntroExperience";
import { FullScreenLoader } from "@/components/shared/FullScreenLoader";

export function EcomIntroScreen({ content }: { content: EcomIntroContent }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading || !user) {
    return <FullScreenLoader />;
  }

  async function handleFinish() {
    if (!user) return;
    // markAboutEcomComplete drives the "היכרות עם Ecom" step in the training
    // roadmap and dashboard next-task card - this Intro is now that step's
    // content, so finishing it completes the step (see next-task.ts).
    await Promise.all([
      progressRepository.markIntroComplete(user.id),
      progressRepository.markAboutEcomComplete(user.id),
    ]);
    router.push("/");
  }

  return <IntroExperience content={content} onFinish={handleFinish} />;
}
