import type { AiEvaluationInput, AiEvaluationResult, AiEvaluatorService } from "@/lib/services/ai-evaluator/types";

/**
 * Placeholder implementation - returns no automatic score at all. This is
 * intentional: until a real AI provider is wired in (via ANTHROPIC_API_KEY,
 * see .env.example), a human reviewer should not receive a fabricated
 * number that looks like a real recommendation. Swap this out for a real
 * implementation behind the same AiEvaluatorService interface when a
 * provider is chosen - nothing else in the codebase needs to change.
 */
export class StubAiEvaluatorService implements AiEvaluatorService {
  async evaluateOpenAnswer(input: AiEvaluationInput): Promise<AiEvaluationResult> {
    const criteria = input.rubric.map((criterion) => ({ criterion, score: 0 }));
    return {
      criteria,
      suggestedScore: 0,
      explanation:
        "הערכת AI אינה מוגדרת עדיין במערכת (ספק AI לא חובר). זהו placeholder בלבד - הבודק האנושי צריך להעריך את התשובה בעצמו מול הרובריקה.",
      strengthsCovered: [],
      gapsOrInaccuracies: [],
    };
  }
}
