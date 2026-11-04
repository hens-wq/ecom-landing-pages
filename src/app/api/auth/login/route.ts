import { NextResponse, type NextRequest } from "next/server";

import { clientKey, recordFailedSignIn, signInBlocked } from "@/lib/auth/limiter";
import { authConfigProblem, issueSession, passwordMatches, SESSION_COOKIE, SESSION_LIFETIME_SECONDS } from "@/lib/auth/token";

// Signs the team in with the shared password. The cookie is HttpOnly, Secure and SameSite=Lax, and expires after 12 hours.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAILURE_DELAY_MS = 400;

export async function POST(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  const problem = authConfigProblem(password, secret);
  if (problem) {
    console.warn(`Sign-in refused: ${problem}.`);
    return NextResponse.json({ error: { code: "not_configured", message: "האימות אינו מוגדר בשרת. פנו למנהל המערכת." } }, { status: 503 });
  }

  const key = clientKey(request);
  if (signInBlocked(key)) {
    return NextResponse.json({ error: { code: "rate_limited", message: "יותר מדי ניסיונות. נסו שוב בעוד כ-15 דקות." } }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "bad_request", message: "הבקשה אינה תקינה." } }, { status: 400 });
  }
  const candidate = typeof body === "object" && body !== null ? (body as { password?: unknown }).password : undefined;
  if (typeof candidate !== "string" || candidate === "" || !passwordMatches(candidate, password ?? "")) {
    recordFailedSignIn(key);
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
    return NextResponse.json({ error: { code: "invalid_password", message: "הסיסמה שגויה." } }, { status: 401 });
  }

  const { token } = issueSession(secret ?? "", Math.floor(Date.now() / 1000));
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_LIFETIME_SECONDS,
  });
  return response;
}
