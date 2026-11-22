/**
 * Completes pending updates. Each open update is matched again against the leads the dashboard knows now,
 * and applied through the same sync the webhook uses. A dry run matches and validates but writes nothing.
 * An update is never applied over a newer write to its lead: it is marked superseded and stays on record.
 * Only counts and short codes are returned; the lead IDs appear only in the admin reply that asked for them.
 */
import {
  checkCrmSyncRequest,
  matchCrmLead,
  syncCrmStatus,
  type CrmStatusStore,
  type CrmSyncInput,
  type DashboardLeadIndex,
} from "@/lib/lead-status/crm-sync";
import { isSuperseded, type CrmChangeRecorder, type PendingRow, type PendingStore } from "@/lib/lead-status/pending-core";
import { isValidIsraeliPhone } from "@/lib/phone";

export type ReplayOutcome =
  | "applied"
  | "would_apply"
  | "superseded"
  | "failed"
  | "not_found"
  | "ambiguous"
  | "invalid_phone"
  | "no_identifier"
  | "meta_unavailable";

export interface ReplayDeps {
  index: DashboardLeadIndex;
  store: CrmStatusStore;
  pending: PendingStore;
  recordCrm: CrmChangeRecorder;
  now: Date;
  dryRun: boolean;
  /** An admin's choice for these rows. The lead must already be known to the dashboard. */
  forcedLeadId?: string;
}

export interface ReplayRowResult {
  id: number;
  outcome: ReplayOutcome;
  leadId?: string;
}

export interface ReplayReport {
  dryRun: boolean;
  checked: number;
  counts: Record<ReplayOutcome, number>;
  rows: ReplayRowResult[];
}

function emptyCounts(): Record<ReplayOutcome, number> {
  return {
    applied: 0,
    would_apply: 0,
    superseded: 0,
    failed: 0,
    not_found: 0,
    ambiguous: 0,
    invalid_phone: 0,
    no_identifier: 0,
    meta_unavailable: 0,
  };
}

type Resolution = { ok: true; leadId: string } | { ok: false; outcome: ReplayOutcome };

/**
 * Which lead the update belongs to now. A lead ID is trusted only when the dashboard knows it. Otherwise a
 * valid phone must match exactly one lead, the same rule the webhook uses.
 */
async function resolveTarget(row: PendingRow, deps: ReplayDeps): Promise<Resolution> {
  if (deps.forcedLeadId !== undefined) {
    return deps.index.byId.has(deps.forcedLeadId) ? { ok: true, leadId: deps.forcedLeadId } : { ok: false, outcome: "not_found" };
  }
  const unknownOutcome: ReplayOutcome = deps.index.metaAvailable ? "not_found" : "meta_unavailable";
  if (row.leadIdHint !== null && deps.index.byId.has(row.leadIdHint)) return { ok: true, leadId: row.leadIdHint };
  if (row.normalizedPhone !== null && isValidIsraeliPhone(row.normalizedPhone)) {
    const match = await matchCrmLead({ phone: row.normalizedPhone }, deps.index, deps.store);
    if (match.ok) return { ok: true, leadId: match.leadId };
    return { ok: false, outcome: match.code === "ambiguous" ? "ambiguous" : unknownOutcome };
  }
  if (row.leadIdHint !== null) return { ok: false, outcome: unknownOutcome };
  if (row.normalizedPhone !== null) return { ok: false, outcome: "invalid_phone" };
  return { ok: false, outcome: "no_identifier" };
}

function syncInputFor(row: PendingRow, leadId: string): CrmSyncInput {
  return {
    leadId,
    phone: row.normalizedPhone ?? undefined,
    mainStatus: row.payload.mainStatus,
    secondaryStatus: row.payload.secondaryStatus,
    fullPaymentAmount: row.payload.fullPaymentAmount,
    partialPaymentAmount: row.payload.partialPaymentAmount,
    studentRating: row.payload.studentRating,
  };
}

function laterOf(floor: Date | null, receivedAt: Date): Date {
  return floor === null || receivedAt.getTime() > floor.getTime() ? receivedAt : floor;
}

/**
 * Oldest first. For each lead, the write time read before this run is the floor: an update received after
 * it may apply, and each applied update raises the floor, so two pending updates for one lead apply in order
 * and the newest one stays in force.
 */
export async function replayPendingRows(rows: PendingRow[], deps: ReplayDeps): Promise<ReplayReport> {
  const report: ReplayReport = { dryRun: deps.dryRun, checked: 0, counts: emptyCounts(), rows: [] };
  const record = (row: PendingRow, outcome: ReplayOutcome, leadId?: string): void => {
    report.checked += 1;
    report.counts[outcome] += 1;
    report.rows.push(leadId === undefined ? { id: row.id, outcome } : { id: row.id, outcome, leadId });
  };

  const ordered = [...rows].sort((a, b) => a.lastReceivedAt.getTime() - b.lastReceivedAt.getTime() || a.id - b.id);
  const floors = new Map<string, Date | null>();

  for (const row of ordered) {
    const resolution = await resolveTarget(row, deps);
    if (!resolution.ok) {
      if (!deps.dryRun) await deps.pending.markChecked(row.id, resolution.outcome);
      record(row, resolution.outcome);
      continue;
    }

    const leadId = resolution.leadId;
    if (!floors.has(leadId)) {
      const existing = await deps.store.get(leadId);
      floors.set(leadId, existing ? new Date(existing.updatedAt) : null);
    }
    const floor = floors.get(leadId) ?? null;
    if (isSuperseded(floor, row.lastReceivedAt)) {
      if (!deps.dryRun) await deps.pending.markSuperseded(row.id, leadId);
      record(row, "superseded", leadId);
      continue;
    }

    const input = syncInputFor(row, leadId);
    if (deps.dryRun) {
      const check = checkCrmSyncRequest(input);
      if (!check.ok) record(row, "failed", leadId);
      else {
        floors.set(leadId, laterOf(floor, row.lastReceivedAt));
        record(row, "would_apply", leadId);
      }
      continue;
    }

    const result = await syncCrmStatus(input, deps.index, deps.store);
    if (!result.ok) {
      await deps.pending.markChecked(row.id, result.code);
      record(row, "failed", leadId);
      continue;
    }
    // The change time is the CRM's own time when it sent one, otherwise the time the update was received.
    const statusChangedAt = row.payload.statusChangedAt ? new Date(row.payload.statusChangedAt) : row.lastReceivedAt;
    await deps.recordCrm({
      leadKey: result.leadId,
      previous: result.previous,
      next: result.record,
      statusChangedAt,
      leadCreatedDate: deps.index.byId.get(result.leadId)?.createdDate,
      now: deps.now,
    });
    await deps.pending.markApplied(row.id, result.leadId);
    floors.set(leadId, laterOf(floor, row.lastReceivedAt));
    record(row, "applied", result.leadId);
  }
  return report;
}
