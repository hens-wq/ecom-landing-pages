import { NextResponse, type NextRequest } from "next/server";

import { sessionStateOf } from "@/lib/auth/session";

// Tells the page whether this browser is signed in. It reveals nothing about the data.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const state = sessionStateOf(request);
  return NextResponse.json({ authenticated: state === "ok", configured: state !== "not_configured" });
}
