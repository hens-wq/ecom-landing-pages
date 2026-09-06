import { StubAiEvaluatorService } from "@/lib/services/ai-evaluator/stub-ai-evaluator-service";
import type { AiEvaluatorService } from "@/lib/services/ai-evaluator/types";

/**
 * Single seam for picking the active AI evaluator implementation. Server-side
 * only - never import this from a "use client" component.
 */
export const aiEvaluatorService: AiEvaluatorService = new StubAiEvaluatorService();

export type { AiEvaluationCriterion, AiEvaluationInput, AiEvaluationResult, AiEvaluatorService } from "@/lib/services/ai-evaluator/types";
