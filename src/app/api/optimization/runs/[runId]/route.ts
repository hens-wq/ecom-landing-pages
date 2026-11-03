import { NextResponse } from "next/server";

import { getOptimizationRepository } from "@/lib/optimization/server/repository";
import { optimizationErrorResponse } from "@/lib/optimization/server/http";

// Reads one saved run and its action statuses. Opening a saved report never starts a new analysis.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  try {
    const repository = getOptimizationRepository();
    const record = await repository.getRun(runId);
    if (!record) {
      return NextResponse.json({ error: { code: "not_found", message: "הדוח לא נמצא." } }, { status: 404 });
    }
    const statuses = await repository.getStatuses(runId);
    return NextResponse.json({ run: record, statuses });
  } catch (error) {
    return optimizationErrorResponse(error);
  }
}
