/**
 * Completes pending updates. Each open update is matched against the leads the dashboard knows now, by the same
 * rules as the live webhook, and applied through the same sync. The stored state is read again for every row, so a
 * write made a moment earlier (a webhook, a dashboard edit, an earlier row of this run) is always seen.
 *
 * Judgement per field group: a status change and a rating each have their own write time on the lead. An update is
 * never applied over a newer write to its own field group. When only one group is superseded, the other still applies.
 *
 * A dry run matches, judges and previews, and writes nothing. The preview also says what each row would queue for
 * Meta: which CRM events, whether sending is on, and why an event would not be queued. An imported row carries no
 * reliable change time, so it never queues a CRM event: the dashboard is updated and nothing is sent.
 *
 * Only counts, short codes and (for an admin request) lead IDs appear in a reply.
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
  isSuperseded,
  payloadParts,
  type CrmChangeRecorder,
  type PendingPayload,
  type PendingRow,
  type PendingStore,
} from "@/lib/lead-status/pending-core";
import { resolveStatusUpdate } from "@/lib/lead-status/validation";
import type { LeadStatusRecord } from "@/lib/lead-status/types";
import { buildCrmEvent } from "@/lib/crm-capi/event";
import { QUALIFIED_EVENT_NAME, REGISTERED_EVENT_NAME } from "@/lib/crm-capi/config";
import { eventTimeFor } from "@/lib/crm-capi/pipeline";
import { crmEventsForChange, type CrmEventType, type LeadQualitySnapshot } from "@/lib/crm-capi/rules";
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

/** What one row would do for Meta, as a dry run reports it. */
export type CrmPreviewAction =
  /** Would be queued, and sent when sending is on. */
  | "queue"
  /** The outbox already has this event type for this lead, or an earlier row of this run queued it. */
  | "already_queued"
  /** META_CAPI_CRM_SEND_ENABLED is not "true", or the dataset or token is missing: nothing is queued. */
  | "skip_sending_off"
  /** Older than the Meta window: never queued. */
  | "skip_too_old"
  /** An imported rating: its change time is not known, so nothing is queued. */
  | "skip_no_reliable_date"
  /** The lead key is not a Meta Lead ID: nothing is sent to Meta. */
  | "skip_not_meta_lead";

export interface CrmPreviewEvent {
  eventType: CrmEventType;
  eventName: string;
  /** The time Meta would receive (ISO 8601). Null when there is no reliable time. */
  eventTime: string | null;
  action: CrmPreviewAction;
}

/** The CRM settings and the outbox check a dry run needs. Both are read-only. */
export interface ReplayCrmPreview {
  /** True only when sending is on (see crm-capi/config.ts). */
  sendEnabled: boolean;
  /** True when the outbox already holds an event of this type for this lead. */
  isQueued: (leadKey: string, eventType: CrmEventType) => Promise<boolean>;
}

export interface ReplayDeps {
  index: DashboardLeadIndex;
  store: CrmStatusStore;
  pending: PendingStore;
  recordCrm: CrmChangeRecorder;
  now: Date;
  dryRun: boolean;
  /** An admin's choice for these rows. The lead must already be known to the dashboard. */
  forcedLeadId?: string;
  /** Dry run only: what each row would queue for Meta. Without it the report carries no CRM preview. */
  crm?: ReplayCrmPreview;
}

export interface ReplayRowResult {
  id: number;
  outcome: ReplayOutcome;
  leadId?: string;
  /** Set when only part of an update applied: "status_superseded" or "rating_superseded". Not stored. */
  note?: string;
  crm?: CrmPreviewEvent[];
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

/** The part of the update that applies. A superseded field group is left out entirely. */
function applicablePayload(payload: PendingPayload, applyStatus: boolean, applyRating: boolean): PendingPayload {
  const out: PendingPayload = {};
  if (applyStatus) {
    if (payload.mainStatus !== undefined) out.mainStatus = payload.mainStatus;
    if (payload.secondaryStatus !== undefined) out.secondaryStatus = payload.secondaryStatus;
    if (payload.fullPaymentAmount !== undefined) out.fullPaymentAmount = payload.fullPaymentAmount;
    if (payload.partialPaymentAmount !== undefined) out.partialPaymentAmount = payload.partialPaymentAmount;
    if (payload.statusChangedAt !== undefined) out.statusChangedAt = payload.statusChangedAt;
  }
  if (applyRating && payload.studentRating !== undefined) out.studentRating = payload.studentRating;
  return out;
}

function syncInputFor(row: PendingRow, leadId: string, payload: PendingPayload): CrmSyncInput {
  return {
    leadId,
    phone: row.normalizedPhone ?? undefined,
    mainStatus: payload.mainStatus,
    secondaryStatus: payload.secondaryStatus,
    fullPaymentAmount: payload.fullPaymentAmount,
    partialPaymentAmount: payload.partialPaymentAmount,
    studentRating: payload.studentRating,
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

/** The status the lead would hold after this update, as the CRM rules see it. Null when the status cannot be resolved. */
function snapshotAfter(existing: LeadStatusRecord | undefined, payload: PendingPayload, applyStatus: boolean): LeadQualitySnapshot | null {
  let mainStatus: string = existing?.mainStatus ?? "חדש";
  let secondaryStatus: string = existing?.secondaryStatus ?? "חדש";
  if (applyStatus) {
    const resolved = resolveStatusUpdate(
      {
        mainStatus: payload.mainStatus ?? "",
        secondaryStatus: payload.secondaryStatus ?? "",
        fullPaymentAmount: payload.fullPaymentAmount,
        partialPaymentAmount: payload.partialPaymentAmount,
      },
      existing
    );
    if (!resolved.ok) return null;
    mainStatus = resolved.value.mainStatus;
    secondaryStatus = resolved.value.secondaryStatus;
  }
  const studentRating = payload.studentRating !== undefined ? payload.studentRating : (existing?.studentRating ?? null);
  return { mainStatus, secondaryStatus, studentRating };
}

/**
 * What the outbox would receive for this row. Read-only. A later row of the same run that would queue the same
 * event type is reported as already_queued, because the outbox keeps only the first event of each type per lead.
 */
async function crmPreview(
  row: PendingRow,
  leadId: string,
  before: LeadQualitySnapshot | undefined,
  after: LeadQualitySnapshot,
  deps: ReplayDeps,
  queuedInRun: Set<string>
): Promise<CrmPreviewEvent[]> {
  const crm = deps.crm;
  if (!crm) return [];
  const events: CrmPreviewEvent[] = [];
  for (const eventType of crmEventsForChange(before, after)) {
    const eventName = eventType === "qualified" ? QUALIFIED_EVENT_NAME : REGISTERED_EVENT_NAME;
    if (row.reason === "imported") {
      events.push({ eventType, eventName, eventTime: null, action: "skip_no_reliable_date" });
      continue;
    }
    // The same time the live path would use: the CRM's own change time when it sent one, otherwise the time the update arrived.
    const statusChangedAt = row.payload.statusChangedAt ? new Date(row.payload.statusChangedAt) : row.sourceAt;
    const eventTime = eventTimeFor({ statusChangedAt, leadCreatedDate: deps.index.byId.get(leadId)?.createdDate, now: deps.now });
    const built = buildCrmEvent({ eventType, metaLeadId: leadId, eventTime, now: deps.now });
    if (!built.ok) {
      const action: CrmPreviewAction = built.reason === "invalid_meta_lead_id" ? "skip_not_meta_lead" : "skip_too_old";
      events.push({ eventType, eventName, eventTime: eventTime.toISOString(), action });
      continue;
    }
    const key = `${leadId}|${eventType}`;
    let action: CrmPreviewAction;
    if (!crm.sendEnabled) action = "skip_sending_off";
    else if (queuedInRun.has(key) || (await crm.isQueued(leadId, eventType))) action = "already_queued";
    else action = "queue";
    if (action === "queue") queuedInRun.add(key);
    events.push({ eventType, eventName, eventTime: eventTime.toISOString(), action });
  }
  return events;
}

/**
 * Oldest change first. Each row is judged against the lead as it is stored at that moment. Each field group has its
 * own write time, so a later status change does not hold back a pending rating, and a newer rating does not hold
 * back a status update.
 */
export async function replayPendingRows(rows: PendingRow[], deps: ReplayDeps): Promise<ReplayReport> {
  const report: ReplayReport = { dryRun: deps.dryRun, checked: 0, counts: emptyCounts(), rows: [] };
  const record = (
    row: PendingRow,
    outcome: ReplayOutcome,
    leadId?: string,
    extra: { note?: string; crm?: CrmPreviewEvent[] } = {}
  ): void => {
    report.checked += 1;
    report.counts[outcome] += 1;
    const entry: ReplayRowResult = { id: row.id, outcome };
    if (leadId !== undefined) entry.leadId = leadId;
    if (extra.note !== undefined) entry.note = extra.note;
    if (extra.crm !== undefined) entry.crm = extra.crm;
    report.rows.push(entry);
  };

  const ordered = [...rows].sort((a, b) => a.sourceAt.getTime() - b.sourceAt.getTime() || a.id - b.id);
  const queuedInRun = new Set<string>();

  for (const row of ordered) {
    const resolution = await resolveTarget(row, deps);
    if (!resolution.ok) {
      if (!deps.dryRun) await deps.pending.markChecked(row.id, resolution.outcome);
      record(row, resolution.outcome);
      continue;
    }
    const leadId = resolution.leadId;

    // Read again for every row. A dry run reads the state from before the run, since it writes nothing.
    const existing = await deps.store.get(leadId);
    const floors = existing ? fieldFloorsOf(existing) : { status: null, rating: null };
    const parts = payloadParts(row.payload);
    const statusSuperseded = parts.status && isSuperseded(floors.status, row.sourceAt);
    const ratingSuperseded = parts.rating && isSuperseded(floors.rating, row.sourceAt);
    const applyStatus = parts.status && !statusSuperseded;
    const applyRating = parts.rating && !ratingSuperseded;

    if (!applyStatus && !applyRating) {
      if (!deps.dryRun) await deps.pending.markSuperseded(row.id, leadId);
      record(row, "superseded", leadId);
      continue;
    }

    const note = statusSuperseded ? "status_superseded" : ratingSuperseded ? "rating_superseded" : undefined;
    const payload = applicablePayload(row.payload, applyStatus, applyRating);
    const input = syncInputFor(row, leadId, payload);

    if (deps.dryRun) {
      if (!checkCrmSyncRequest(input).ok) {
        record(row, "failed", leadId);
        continue;
      }
      const before: LeadQualitySnapshot | undefined = existing
        ? { mainStatus: existing.mainStatus, secondaryStatus: existing.secondaryStatus, studentRating: existing.studentRating }
        : undefined;
      const after = snapshotAfter(existing, payload, applyStatus);
      if (after === null) {
        record(row, "failed", leadId);
        continue;
      }
      const crm = await crmPreview(row, leadId, before, after, deps, queuedInRun);
      record(row, "would_apply", leadId, { note, crm: deps.crm ? crm : undefined });
      continue;
    }

    const result = await syncCrmStatus(input, deps.index, storeAt(deps.store, row.sourceAt));
    if (!result.ok) {
      await deps.pending.markChecked(row.id, result.code);
      record(row, "failed", leadId);
      continue;
    }
    // An import carries no reliable change time: the dashboard is updated and nothing is queued for Meta.
    if (row.reason !== "imported") {
      const statusChangedAt = row.payload.statusChangedAt ? new Date(row.payload.statusChangedAt) : row.sourceAt;
      await deps.recordCrm({
        leadKey: result.leadId,
        previous: result.previous,
        next: result.record,
        statusChangedAt,
        leadCreatedDate: deps.index.byId.get(result.leadId)?.createdDate,
        now: deps.now,
      });
    }
    await deps.pending.markApplied(row.id, result.leadId);
    record(row, "applied", result.leadId, { note });
  }
  return report;
}
