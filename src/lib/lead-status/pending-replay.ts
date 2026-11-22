/**
 * Completes pending updates. Each open update is matched again against the leads the dashboard knows now, by the
 * same rules as the live webhook, and applied through the same sync. A dry run matches and validates but writes
 * nothing. An update is never applied over a newer write to the same field of its lead: it is marked superseded
 * and stays on record. An update whose match is uncertain is held, never guessed at.
 * Only counts and short codes are returned; lead IDs appear only in an admin reply that asked for them.
 */
import {
  checkCrmSyncRequest,
  matchCrmLead,
  syncCrmStatus,
  type CrmStatusStore,
  type CrmSyncInput,
  type DashboardLeadIndex,
} from "@/lib/lead-status/crm-sync";
import {
  fieldFloorsOf,
  isUpdateSuperseded,
  payloadParts,
  type CrmChangeRecorder,
  type FieldFloors,
  type PendingRow,
  type PendingStore,
} from "@/lib/lead-status/pending-core";
import { isValidIsraeliPhone } from "@/lib/phone";

export type ReplayOutcome =
  | "applied"
  | "would_apply"
  | "superseded"
  | "failed"
  | "not_found"
  | "ambiguous"
  | "unverified"
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
    unverified: 0,
    invalid_phone: 0,
    no_identifier: 0,
    meta_unavailable: 0,
  };
}

type Resolution = { ok: true; leadId: string } | { ok: false; outcome: ReplayOutcome };

/**
 * Which lead the update belongs to now. A lead ID is trusted only when the dashboard knows it. Otherwise a valid
 * phone must identify exactly one lead through its own phone question (or a stored earlier match). Anything less
 * certain is reported, not applied.
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
    if (match.code === "ambiguous") return { ok: false, outcome: "ambiguous" };
    if (match.code === "unverified") return { ok: false, outcome: "unverified" };
    return { ok: false, outcome: unknownOutcome };
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

/** The same store, with the update's own time attached to every write it makes, so the field times are the update's. */
function storeAt(store: CrmStatusStore, sourceAt: Date): CrmStatusStore {
  return {
    get: (leadId) => store.get(leadId),
    findLeadIdsByNormalizedPhone: (normalizedPhone) => store.findLeadIdsByNormalizedPhone(normalizedPhone),
    upsert: (leadId, patch) => store.upsert(leadId, { ...patch, sourceAt }),
    upsertStudentRating: (leadId, studentRating, normalizedPhone) => store.upsertStudentRating(leadId, studentRating, normalizedPhone, sourceAt),
  };
}

function later(floor: Date | null, sourceAt: Date): Date {
  return floor === null || sourceAt.getTime() > floor.getTime() ? sourceAt : floor;
}

/**
 * Oldest change first. For each lead the floors are read before this run. After an update is applied, its time
 * becomes the floor of the field it changed, so two pending updates for one lead apply in order and the newest one
 * stays in force. Each field has its own floor: a later status change does not hold back a pending rating.
 */
export async function replayPendingRows(rows: PendingRow[], deps: ReplayDeps): Promise<ReplayReport> {
  const report: ReplayReport = { dryRun: deps.dryRun, checked: 0, counts: emptyCounts(), rows: [] };
  const record = (row: PendingRow, outcome: ReplayOutcome, leadId?: string): void => {
    report.checked += 1;
    report.counts[outcome] += 1;
    report.rows.push(leadId === undefined ? { id: row.id, outcome } : { id: row.id, outcome, leadId });
  };

  const ordered = [...rows].sort((a, b) => a.sourceAt.getTime() - b.sourceAt.getTime() || a.id - b.id);
  const floors = new Map<string, FieldFloors>();

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
      floors.set(leadId, existing ? fieldFloorsOf(existing) : { status: null, rating: null });
    }
    const floor = floors.get(leadId) ?? { status: null, rating: null };
    if (isUpdateSuperseded(row.payload, row.sourceAt, floor)) {
      if (!deps.dryRun) await deps.pending.markSuperseded(row.id, leadId);
      record(row, "superseded", leadId);
      continue;
    }

    const input = syncInputFor(row, leadId);
    const parts = payloadParts(row.payload);
    const raiseFloors = (): void => {
      floors.set(leadId, {
        status: parts.status ? later(floor.status, row.sourceAt) : floor.status,
        rating: parts.rating ? later(floor.rating, row.sourceAt) : floor.rating,
      });
    };

    if (deps.dryRun) {
      if (!checkCrmSyncRequest(input).ok) record(row, "failed", leadId);
      else {
        raiseFloors();
        record(row, "would_apply", leadId);
      }
      continue;
    }

    const result = await syncCrmStatus(input, deps.index, storeAt(deps.store, row.sourceAt));
    if (!result.ok) {
      await deps.pending.markChecked(row.id, result.code);
      record(row, "failed", leadId);
      continue;
    }
    // The CRM's own change time when it sent one; otherwise the time the update happened.
    const statusChangedAt = row.payload.statusChangedAt ? new Date(row.payload.statusChangedAt) : row.sourceAt;
    await deps.recordCrm({
      leadKey: result.leadId,
      previous: result.previous,
      next: result.record,
      statusChangedAt,
      leadCreatedDate: deps.index.byId.get(result.leadId)?.createdDate,
      now: deps.now,
    });
    await deps.pending.markApplied(row.id, result.leadId);
    raiseFloors();
    record(row, "applied", result.leadId);
  }
  return report;
}
