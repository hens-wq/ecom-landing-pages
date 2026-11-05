import { NextResponse, type NextRequest } from "next/server";

import { isApiPath, isPublicRequest } from "@/lib/auth/access";
import { privateAreaOpen } from "@/lib/auth/mode";

/**
 * The first gate, on every request outside the static files. Where the private area is open (Vercel Preview, or the
 * deployment that Vercel Deployment Protection covers), every request continues. Elsewhere only the public routes continue,
 * and each of them checks its own Bearer secret where it needs one. Any other page or API answers 404.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (privateAreaOpen({ VERCEL_ENV: process.env.VERCEL_ENV, ECOM_ADMIN_ACCESS: process.env.ECOM_ADMIN_ACCESS })) {
    return NextResponse.next();
  }
  if (isPublicRequest(pathname, request.method)) return NextResponse.next();

  if (isApiPath(pathname)) {
    return NextResponse.json({ error: { code: "not_found", message: "לא נמצא." } }, { status: 404 });
  }
  return new NextResponse("לא נמצא.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export const config = {
  // Static assets, image optimisation and the favicon never need the gate. Files in /public keep their own rules.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:js|css|png|jpe?g|gif|svg|webp|ico|txt|woff2?)$).*)"],
};
