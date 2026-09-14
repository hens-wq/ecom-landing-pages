import "server-only";

import { checkMetaConfig } from "@/lib/advertising/meta/config";
import { AdvertisingApiError, type DateRange } from "@/lib/advertising/types";
import { MockLeadsProvider } from "@/lib/leads/mock-provider";
import { MetaLeadsProvider } from "@/lib/leads/meta/provider";
import type { LeadsResult } from "@/lib/leads/types";

/**
 * Mirrors lib/advertising/index.ts exactly: not configured -> mock leads
 * (Phase 1 data, reshaped); partially configured -> a real configuration
 * error, never a silent mock fallback; fully configured -> live Meta Instant
 * Form leads, or throws AdvertisingApiError if the call fails. Reuses the
 * exact same Meta config/credentials as the advertising integration - there
 * is only one Meta connection in this app, not a second one to configure.
 */
export async function getLeadsData(range: DateRange): Promise<LeadsResult> {
  const check = checkMetaConfig();

  if (check.status === "unconfigured") {
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

  const provider = new MetaLeadsProvider(check.config);
  const leads = await provider.getLeads(range);
  return { source: "meta", leads };
}

export type { LeadsResult, LeadsSource, MetaFormLead } from "@/lib/leads/types";
