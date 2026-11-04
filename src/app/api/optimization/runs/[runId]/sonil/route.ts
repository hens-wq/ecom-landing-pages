import { NextResponse, type NextRequest } from "next/server";

import { optimizationErrorResponse } from "@/lib/optimization/server/http";
import { latestSonil, saveSonil } from "@/lib/optimization/server/sonil";

// The saved Sonil report for one run, compared with our recommendations. Reading it never starts an analysis.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  try {
    const result = await latestSonil(runId);
    if (result === "not_found") {
      return NextResponse.json({ error: { code: "not_found", message: "הדוח לא נמצא." } }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return optimizationErrorResponse(error);
  }
}

// Saves a Sonil report against one run, after the person has checked the preview and the mapping. Our analysis is not changed.
export async function POST(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  try {
    const result = await saveSonil(runId, request);
    if (result === "not_found") {
      return NextResponse.json({ error: { code: "not_found", message: "הדוח לא נמצא." } }, { status: 404 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return optimizationErrorResponse(error);
  }
}
