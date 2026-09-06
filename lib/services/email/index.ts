import { StubEmailService } from "@/lib/services/email/stub-email-service";
import type { EmailService } from "@/lib/services/email/types";

/**
 * Single seam for picking the active email provider implementation.
 * Server-side only - never import this from a "use client" component.
 */
export const emailService: EmailService = new StubEmailService();

export type { EmailService, QuizReviewEmailPayload, QuizReviewMcqRow } from "@/lib/services/email/types";
