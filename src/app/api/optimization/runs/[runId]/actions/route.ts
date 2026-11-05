import { NextResponse, type NextRequest } from "next/server";

import { parseActionStatus } from "@/lib/optimization/labels";
import { badRequest, optimizationErrorResponse } from "@/lib/optimization/server/http";
import { getOptimizationRepository } from "@/lib/optimization/server/repository";

// Records what a person did about one recommendation: ממתין, בוצע or לא מבצע. It is documentation only. It never
// sends anything to Meta, and it never starts an analysis.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {

  const { runId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("גוף הבקשה אינו JSON תקין.");
  }
  const fields = typeof body === "object" && body !== null ? (body as { recommendationId?: unknown; status?: unknown }) : {};
  const recommendationId = typeof fields.recommendationId === "string" ? fields.recommendationId : "";
  const status = parseActionStatus(fields.status);
  if (!recommendationId || !status) {
    return badRequest("יש לשלוח recommendationId וסטטוס תקין: pending, done או not_done.");
  }

  try {
    const repository = getOptimizationRepository();
    const record = await repository.getRun(runId);
    if (!record) {
      return NextResponse.json({ error: { code: "not_found", message: "הדוח לא נמצא." } }, { status: 404 });
    }
    if (!record.output.recommendations.some((recommendation) => recommendation.id === recommendationId)) {
      return NextResponse.json({ error: { code: "not_found", message: "ההמלצה לא נמצאה בדוח הזה." } }, { status: 404 });
    }
    await repository.setStatus(runId, recommendationId, status);
    return NextResponse.json({ ok: true, statuses: await repository.getStatuses(runId) });
  } catch (error) {
    return optimizationErrorResponse(error);
  }
}
