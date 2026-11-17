import { NextResponse, type NextRequest } from "next/server";

import { optimizationErrorResponse } from "@/lib/optimization/server/http";
import { previewSonil } from "@/lib/optimization/server/sonil";

// Reads a Sonil file before it is saved: its columns and first rows, and, when a mapping is sent, the checks and the
// comparison. Nothing is stored.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {

  const { runId } = await params;
  try {
    const result = await previewSonil(runId, request);
    if (result === "not_found") {
      return NextResponse.json({ error: { code: "not_found", message: "הדוח לא נמצא." } }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return optimizationErrorResponse(error);
  }
}
