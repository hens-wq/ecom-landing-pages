import { NextResponse } from "next/server";

import { checkDatabaseHealth } from "@/lib/lead-status/db";
import { denyUnlessPrivateAreaOpen } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Drives the "מסד נתונים מחובר" indicator on the Leads page - never throws, checkDatabaseHealth() always resolves to a plain connected/message result. */
export async function GET() {
  const denied = denyUnlessPrivateAreaOpen();
  if (denied) return denied;

  const health = await checkDatabaseHealth();
  return NextResponse.json(health);
}
