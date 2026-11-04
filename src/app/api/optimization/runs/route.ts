import { NextResponse, type NextRequest } from "next/server";

import { isValidDateRange } from "@/lib/advertising/date-range";
import type { DateRange } from "@/lib/advertising/types";
import { runRangeError } from "@/lib/optimization/run";
import { badRequest, optimizationErrorResponse } from "@/lib/optimization/server/http";
import { createOptimizationRun } from "@/lib/optimization/server/service";
import { getOptimizationRepository } from "@/lib/optimization/server/repository";
import { demoDataEnabled } from "@/lib/runtime-mode";
import { denyWithoutSession } from "@/lib/auth/session";

// Optimization runs: list saved runs (GET) and start a new run on request (POST). A run never starts on a page load.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = denyWithoutSession(request);
  if (denied) return denied;

  try {
    const runs = await getOptimizationRepository().listRuns(20);
    return NextResponse.json({ runs, storage: demoDataEnabled() ? "memory" : "database" });
  } catch (error) {
    return optimizationErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const denied = denyWithoutSession(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("גוף הבקשה אינו JSON תקין.");
  }

  const fields = typeof body === "object" && body !== null ? (body as { since?: unknown; until?: unknown }) : {};
  const range: DateRange = {
    since: typeof fields.since === "string" ? fields.since : "",
    until: typeof fields.until === "string" ? fields.until : "",
  };
  if (!isValidDateRange(range)) {
    return badRequest("פרמטרי טווח תאריכים (since/until) חסרים או לא תקינים.");
  }
  const rangeProblem = runRangeError(range);
  if (rangeProblem) return badRequest(rangeProblem);

  try {
    const record = await createOptimizationRun(range, new Date());
    return NextResponse.json({ run: record }, { status: 201 });
  } catch (error) {
    return optimizationErrorResponse(error);
  }
}
