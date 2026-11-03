import "server-only";

import { NextResponse } from "next/server";

import { AdvertisingApiError, httpStatusForErrorCode } from "@/lib/advertising/types";
import { OptimizationDatabaseError } from "@/lib/optimization/server/db";

/** Turns any failure of an optimization route into a JSON error with a Hebrew, user-safe message. */
export function optimizationErrorResponse(error: unknown): NextResponse {
  if (error instanceof AdvertisingApiError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: httpStatusForErrorCode(error.code) });
  }
  if (error instanceof OptimizationDatabaseError) {
    return NextResponse.json({ error: { code: "database_error", message: error.message } }, { status: 503 });
  }
  return NextResponse.json({ error: { code: "unknown_error", message: "שגיאה לא צפויה בהרצת הניתוח." } }, { status: 500 });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: { code: "bad_request", message } }, { status: 400 });
}
