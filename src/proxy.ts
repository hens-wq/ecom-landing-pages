import { NextResponse, type NextRequest } from "next/server";

import { isApiPath, isPublicRequest } from "@/lib/auth/access";
import { appSignInRequired } from "@/lib/auth/mode";
import { authConfigProblem, isSessionValid, SESSION_COOKIE } from "@/lib/auth/token";

/**
 * The first gate, on every request outside the public list. Pages go to the sign-in page; APIs get a JSON 401. The check here
 * only reads the signed cookie. The data routes check the same session again themselves (see lib/auth/session.ts).
 */
export function proxy(request: NextRequest) {
  // Vercel Preview: Deployment Protection is the gate there, so the app's own sign-in is off (see lib/auth/mode.ts).
  if (!appSignInRequired(process.env.VERCEL_ENV)) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  if (isPublicRequest(pathname, request.method)) return NextResponse.next();

  const password = process.env.DASHBOARD_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  const configured = authConfigProblem(password, secret) === null;
  const signedIn = configured && isSessionValid(request.cookies.get(SESSION_COOKIE)?.value, secret ?? "", Math.floor(Date.now() / 1000));
  if (signedIn) return NextResponse.next();

  if (isApiPath(pathname)) {
    return NextResponse.json(
      configured
        ? { error: { code: "unauthenticated", message: "נדרשת התחברות." } }
        : { error: { code: "not_configured", message: "האימות אינו מוגדר בשרת. פנו למנהל המערכת." } },
      { status: configured ? 401 : 503 }
    );
  }
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  // Static assets, image optimisation and the favicon never need the session. Files in /public keep their own rules.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:js|css|png|jpe?g|gif|svg|webp|ico|txt|woff2?)$).*)"],
};
