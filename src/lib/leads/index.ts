import "server-only";

import { checkMetaConfig } from "@/lib/advertising/meta/config";
import { AdvertisingApiError, type DateRange } from "@/lib/advertising/types";
import { MockLeadsProvider } from "@/lib/leads/mock-provider";
import { MetaLeadsProvider } from "@/lib/leads/meta/provider";
import type { LeadsResult } from "@/lib/leads/types";
import { META_NOT_CONFIGURED_MESSAGE, demoDataEnabled } from "@/lib/runtime-mode";

/**
 * Mirrors lib/advertising/index.ts exactly: not configured -> an explicit error,
 * or demo leads only when ECOM_DEMO_DATA=1; partially configured -> a real configuration
 * error, never a silent mock fallback; fully configured -> live Meta Instant
 * Form leads, or throws AdvertisingApiError if the call fails. Reuses the
 * exact same Meta config/credentials as the advertising integration - there
 * is only one Meta connection in this app, not a second one to configure.
 */
export async function getLeadsData(range: DateRange): Promise<LeadsResult> {
  const check = checkMetaConfig();

  if (check.status === "unconfigured") {
    if (!demoDataEnabled()) {
      throw new AdvertisingApiError("not_configured", META_NOT_CONFIGURED_MESSAGE, "Meta env vars are empty and ECOM_DEMO_DATA is not set");
    }
    const provider = new MockLeadsProvider();
    const leads = await provider.getLeads(range);
    return { source: "mock", leads };
  }

  if (check.status === "incomplete") {
    const missingLabel = check.missing.join(", ");
    throw new AdvertisingApiError(
      check.missing.includes("META_ACCESS_TOKEN") ? "missing_token" : "missing_account_id",
      `הגדרת Meta Ads חסרה: ${missingLabel}. יש להשלים את שני משתני הסביבה כדי לטעון לידים אמיתיים, או להשאיר את שניהם ריקים כדי להמשיך עם נתוני דמו.`,
      `Missing env vars: ${missingLabel}`
    );
  }

  const provider = new MetaLeadsProvider();
  const leads = await provider.getLeads(range);
  return { source: "meta", leads };
}

export type { LeadsResult, LeadsSource, MetaFormLead } from "@/lib/leads/types";
