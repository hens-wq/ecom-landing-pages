import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/token";

// Ends the session on this browser. The cookie is cleared; nothing is stored on the server.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
