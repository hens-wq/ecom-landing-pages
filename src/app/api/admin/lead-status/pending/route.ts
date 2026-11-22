import { after } from "next/server";

import { flushCrmEventsSafely, recordCrmChangeSafely } from "@/lib/crm-capi/service";
import { loadDashboardLeadIndex } from "@/lib/lead-status/dashboard-leads";
import { handlePendingAction, handlePendingList, type PendingAdminDeps } from "@/lib/lead-status/pending-admin-handler";
import { pendingStore } from "@/lib/lead-status/pending-store";
import { getLeadStatusRepository } from "@/lib/lead-status/repository";

// Never statically cached. Node runtime. A replay reads every lead from Meta, so it can take a while.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET  /api/admin/lead-status/pending   - the pending Fireberry status updates, newest first
 * POST /api/admin/lead-status/pending   - replay (optionally a dry run), apply one to a known lead, or dismiss one
 *   Authorization: Bearer <LEAD_STATUS_ADMIN_SECRET>
 *
 * The admin secret is its own credential: the webhook tokens cannot call these routes.
 */
function deps(): PendingAdminDeps {
  return {
    env: process.env,
    now: () => new Date(),
    loadIndex: loadDashboardLeadIndex,
    store: getLeadStatusRepository(),
    pending: pendingStore,
    recordCrm: recordCrmChangeSafely,
    schedule: (task) => after(task),
    flush: (limit) => flushCrmEventsSafely(limit),
  };
}

export async function GET(request: Request) {
  return handlePendingList(request, deps());
}

export async function POST(request: Request) {
  return handlePendingAction(request, deps());
}
