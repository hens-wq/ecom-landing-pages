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
    await progressRepository.markIntroComplete(user.id);
    router.push("/");
  }

  return <IntroExperience content={content} onFinish={handleFinish} />;
}
