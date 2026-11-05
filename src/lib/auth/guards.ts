import "server-only";

import { notFound } from "next/navigation";
import { NextResponse } from "next/server";

import { privateAreaOpenNow } from "@/lib/auth/mode";

/**
 * The second gate, inside each private route. The proxy is the first. Returns null when the request may continue, and
 * otherwise the 404 to send. Where the private area is closed, the route does not reveal that its data exists.
 */
export function denyUnlessPrivateAreaOpen(): NextResponse | null {
  if (privateAreaOpenNow()) return null;
  return NextResponse.json({ error: { code: "not_found", message: "לא נמצא." } }, { status: 404 });
}

/** For a server component: the private pages do not exist where the private area is closed. */
export function requirePrivatePage(): void {
  if (!privateAreaOpenNow()) notFound();
}
