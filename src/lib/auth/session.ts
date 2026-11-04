import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { authConfigProblem, isSessionValid, SESSION_COOKIE } from "@/lib/auth/token";

/**
 * Checks the team's session on the server. Route handlers call denyWithoutSession first, and the dashboard layout calls
 * requirePageSession. The proxy is only a first, optimistic gate: these checks are the ones that protect the data.
 */

export type SessionState = "ok" | "unauthenticated" | "not_configured";

function cookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function sessionStateFromCookieHeader(cookieHeader: string | null): SessionState {
  const password = process.env.DASHBOARD_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  const problem = authConfigProblem(password, secret);
  if (problem) {
    console.warn(`Access refused: ${problem}.`);
    return "not_configured";
  }
  const token = cookieValue(cookieHeader, SESSION_COOKIE);
  return isSessionValid(token, secret ?? "", Math.floor(Date.now() / 1000)) ? "ok" : "unauthenticated";
}

export function sessionStateOf(request: Request): SessionState {
  return sessionStateFromCookieHeader(request.headers.get("cookie"));
}

/** For a route handler: null when the request may continue, or the refusal to return. Never reveals data either way. */
export function denyWithoutSession(request: Request): NextResponse | null {
  const state = sessionStateOf(request);
  if (state === "ok") return null;
  if (state === "not_configured") {
    return NextResponse.json({ error: { code: "not_configured", message: "האימות אינו מוגדר בשרת. פנו למנהל המערכת." } }, { status: 503 });
  }
  return NextResponse.json({ error: { code: "unauthenticated", message: "נדרשת התחברות." } }, { status: 401 });
}

/** True when the current request carries a valid session. For server components that choose what to render. */
export async function hasValidSession(): Promise<boolean> {
  const store = await cookies();
  const cookieHeader = `${SESSION_COOKIE}=${encodeURIComponent(store.get(SESSION_COOKIE)?.value ?? "")}`;
  return sessionStateFromCookieHeader(cookieHeader) === "ok";
}

/** For a server component: sends the visitor to the sign-in page unless the session is valid. */
export async function requirePageSession(): Promise<void> {
  if (!(await hasValidSession())) redirect("/login");
}
