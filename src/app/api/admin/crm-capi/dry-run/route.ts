import { runDryRunRequest } from "@/lib/crm-capi/dry-run-handler";
import { loadDryRunInput } from "@/lib/crm-capi/dry-run-loader";

// Never statically cached. Node runtime. It reads every lead from Meta and the database, so it can take a while.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/admin/crm-capi/dry-run
 *   Authorization: Bearer <CRM_CAPI_DRY_RUN_SECRET>
 *
 * Read-only. It changes no status and sends nothing to Meta. The reply holds counts and campaign IDs
 * and names only.
 */
export async function GET(request: Request) {
  return runDryRunRequest(request, {
    env: process.env,
    now: () => new Date(),
    loadInput: loadDryRunInput,
  });
}
