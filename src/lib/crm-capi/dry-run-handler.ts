/**
 * GET /api/admin/crm-capi/dry-run: the read-only CRM dry run, request handling only. The environment,
 * the clock and the loader are passed in, so the auth rules and the replies are tested without a
 * database or Meta.
 *
 * Authorization: "Authorization: Bearer <CRM_CAPI_DRY_RUN_SECRET>". It has its own secret, never the
 * flush secret, because the flush route sends events and this route must not be able to. It fails
 * closed: no secret, or one shorter than 32 characters, is a 503; a missing or wrong token is a 401.
 * The reply holds counts only: no lead IDs, names, phone numbers, tokens or Meta responses.
 */
import { timingSafeEqual } from "node:crypto";

import { readCrmCapiConfig } from "@/lib/crm-capi/config";
import {
  buildDryRunReport,
  CRM_DATASET_SWITCHED_AT,
  type DryRunConfigFlags,
  type DryRunLoadResult,
} from "@/lib/crm-capi/dry-run";

export const DRY_RUN_SECRET_ENV = "CRM_CAPI_DRY_RUN_SECRET";
export const MIN_DRY_RUN_SECRET_LENGTH = 32;

export type DryRunAuthResult = { ok: true } | { ok: false; status: 401 | 503; message: string };

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function checkDryRunAuthorization(authorization: string | null, configuredSecret: string | undefined): DryRunAuthResult {
  const secret = configuredSecret?.trim() ?? "";
  if (!secret) {
    return { ok: false, status: 503, message: "נקודת הבדיקה אינה מוגדרת (CRM_CAPI_DRY_RUN_SECRET חסר בצד השרת)." };
  }
  if (secret.length < MIN_DRY_RUN_SECRET_LENGTH) {
    return { ok: false, status: 503, message: `CRM_CAPI_DRY_RUN_SECRET קצר מדי (נדרשים לפחות ${MIN_DRY_RUN_SECRET_LENGTH} תווים).` };
  }
  const header = authorization ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!provided || !timingSafeStringEqual(provided, secret)) {
    return { ok: false, status: 401, message: "אימות נכשל." };
  }
  return { ok: true };
}

/** The config flags the report shows. Only whether each value is set; the values themselves are never returned. */
export function configFlags(env: Record<string, string | undefined>): DryRunConfigFlags {
  const config = readCrmCapiConfig(env);
  return {
    sendingEnabled: config.sendEnabled,
    crmDatasetConfigured: config.datasetId !== null,
    crmTokenConfigured: config.accessToken !== null,
  };
}

const LOAD_FAILURE_MESSAGE: Record<"meta_unavailable" | "database_unavailable", string> = {
  meta_unavailable: "קריאת הלידים מ-Meta נכשלה או שאינה מוגדרת. הבדיקה לא הושלמה, ולכן לא מוצגים מספרים.",
  database_unavailable: "מסד הנתונים אינו זמין כרגע. הבדיקה לא הושלמה, ולכן לא מוצגים מספרים.",
};

export interface DryRunHandlerDeps {
  env: Record<string, string | undefined>;
  now: () => Date;
  loadInput: (now: Date) => Promise<DryRunLoadResult>;
}

function jsonReply(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function runDryRunRequest(request: Request, deps: DryRunHandlerDeps): Promise<Response> {
  const auth = checkDryRunAuthorization(request.headers.get("authorization"), deps.env[DRY_RUN_SECRET_ENV]);
  if (!auth.ok) return jsonReply({ error: { message: auth.message } }, auth.status);

  const now = deps.now();
  try {
    const loaded = await deps.loadInput(now);
    if (!loaded.ok) return jsonReply({ error: { message: LOAD_FAILURE_MESSAGE[loaded.reason] } }, 503);
    const report = buildDryRunReport({
      now,
      switchAt: CRM_DATASET_SWITCHED_AT,
      leads: loaded.leads,
      outbox: loaded.outbox,
      config: configFlags(deps.env),
    });
    return jsonReply(report, 200);
  } catch {
    return jsonReply({ error: { message: "שגיאה לא צפויה בבדיקה. לא בוצע שום שינוי, ולא נשלח דבר למטא." } }, 500);
  }
}
