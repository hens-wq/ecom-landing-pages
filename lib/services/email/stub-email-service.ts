import type { EmailService, QuizReviewEmailPayload } from "@/lib/services/email/types";

/**
 * Placeholder implementation - does not actually send anything. Logs a
 * summary server-side so the flow is visible/testable before a real email
 * provider (Resend, SES, etc.) is chosen. Swap this out for a real
 * implementation behind the same EmailService interface once
 * QUIZ_REVIEW_EMAIL and a provider API key are configured - nothing else
 * in the codebase needs to change.
 */
export class StubEmailService implements EmailService {
  async sendQuizReviewEmail(payload: QuizReviewEmailPayload): Promise<void> {
    const reviewEmail = process.env.QUIZ_REVIEW_EMAIL;
    if (!reviewEmail) {
      console.warn(
        "[email-service] QUIZ_REVIEW_EMAIL is not set - quiz review email would not be deliverable yet. " +
          "See .env.example. Continuing without sending (stub provider)."
      );
    }
    console.info(
      `[email-service] (stub, no provider configured) Would send quiz review email to ${reviewEmail ?? "<QUIZ_REVIEW_EMAIL not set>"} ` +
        `for ${payload.repName} - ${payload.courseName} / ${payload.quizTitle} - suggested total ${payload.suggestedTotalScore}/100.`
    );
  }
}
