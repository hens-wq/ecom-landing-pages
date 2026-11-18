import "server-only";

import { isoDateInTimezone } from "@/lib/advertising/timezone";
import {
  mergeDryRunLeads,
  type CrmOutboxStatus,
  type DryRunLoadResult,
  type DryRunOutboxRow,
  type MetaLeadInput,
} from "@/lib/crm-capi/dry-run";
import type { CrmEventType } from "@/lib/crm-capi/rules";
import { ensureSchema, getSqlClient, wrapDatabaseError } from "@/lib/lead-status/db";
import { getLeadStatusRepository } from "@/lib/lead-status/repository";
import { getLandingLeadsInRange } from "@/lib/landing-leads/repository";
import { getLeadsData } from "@/lib/leads";

/**
 * Reads what the dry run needs, from the same sources and range as the dashboard
 * (lib/lead-status/dashboard-leads.ts): every Meta Instant Form lead, every landing lead, every status
 * row and every outbox row. Only SELECT statements. Nothing is written and nothing is sent to Meta.
 */

/** The dashboard's own range (dashboard-leads.ts). */
const ALL_TIME_SINCE = "2010-01-01";

interface OutboxSelectRow {
  lead_key: string;
  event_type: string;
  status: string;
  event_time: string;
  sent_at: string | null;
  last_error: string | null;
}

/** Every outbox row, read-only. */
export async function listOutboxRowsForDryRun(): Promise<DryRunOutboxRow[]> {
  try {
    await ensureSchema();
    const sql = getSqlClient();
    const rows = (await sql`
      SELECT lead_key, event_type, status, event_time, sent_at, last_error
      FROM crm_capi_events
      ORDER BY id
    `) as OutboxSelectRow[];
    return rows.map((row) => ({
      leadKey: row.lead_key,
      eventType: row.event_type as CrmEventType,
      status: row.status as CrmOutboxStatus,
      eventTime: new Date(row.event_time),
      sentAt: row.sent_at === null ? null : new Date(row.sent_at),
      lastError: row.last_error,
    }));
  } catch (error) {
    throw wrapDatabaseError(error, "שגיאה בקריאת אירועי CRM ממסד הנתונים.");
  }
}

/** Loads everything the dry run needs. Never throws: a failure comes back as a reason the reply can name. */
export async function loadDryRunInput(now: Date): Promise<DryRunLoadResult> {
  const today = isoDateInTimezone(now);

  let meta: MetaLeadInput[];
  try {
    const result = await getLeadsData({ since: ALL_TIME_SINCE, until: today });
    // Demo data is never read as real leads: only a live Meta read counts.
    if (result.source !== "meta") return { ok: false, reason: "meta_unavailable" };
    meta = result.leads;
  } catch {
    return { ok: false, reason: "meta_unavailable" };
  }

  try {
    const landing = await getLandingLeadsInRange(ALL_TIME_SINCE, today);
    const statusRows = await getLeadStatusRepository().listAllStatusRows();
    const outbox = await listOutboxRowsForDryRun();
    return { ok: true, leads: mergeDryRunLeads({ meta, landing, statusRows }), outbox };
  } catch {
    return { ok: false, reason: "database_unavailable" };
  }
}
