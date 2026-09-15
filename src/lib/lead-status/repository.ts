import "server-only";

import { defaultLeadStatusRecord, type LeadStatusRecord } from "@/lib/lead-status/types";

/**
 * ============================================================================
 * PERSISTENCE STATUS: NOT YET CONFIGURED - READ THIS BEFORE RELYING ON IT
 * ============================================================================
 *
 * This file defines the repository INTERFACE the rest of the app is meant to
 * talk to (getLeadStatusRepository()), and ONE implementation of it -
 * InMemoryLeadStatusRepository - which exists ONLY so this feature is
 * demoable end-to-end on a Preview deploy. It is NOT real persistence:
 *
 *  - It lives in a plain in-process Map. On Vercel, serverless functions are
 *    ephemeral and often cold-start on a fresh instance per request/burst -
 *    there is no guarantee two requests even hit the same process, so edits
 *    can appear to vanish unpredictably, not just "on the next deploy".
 *  - It is wiped on every deploy, and can be wiped at any time in between
 *    (an idle instance recycling, a scale-to-zero event, etc.).
 *  - It is per-process, never shared across multiple warm instances serving
 *    the same deployment concurrently - two people editing at the same time
 *    can each see a different, incomplete picture.
 *
 * This is exactly what the spec explicitly said not to fake as real
 * persistence - it deliberately is NOT presented as one. See the banner this
 * powers on the Leads page (components/leads/persistence-warning.tsx) and
 * the session's final report for what a real backing store requires.
 *
 * ---- Intended schema for a real backing store (not yet applied anywhere) ----
 *
 *   CREATE TABLE lead_status (
 *     lead_id                text PRIMARY KEY,          -- Meta Lead ID - the only real key
 *     phone                  text,                       -- secondary matching aid only, never a key
 *     main_status            text NOT NULL,
 *     secondary_status       text NOT NULL,
 *     full_payment_amount    numeric,
 *     partial_payment_amount numeric,
 *     updated_at             timestamptz NOT NULL DEFAULT now()
 *   );
 *   CREATE INDEX lead_status_phone_idx ON lead_status (phone);
 *
 * Swapping in a real implementation later is meant to be a single new class
 * in this file (e.g. PostgresLeadStatusRepository) plus a one-line change to
 * getLeadStatusRepository() below - nothing outside this file (the API
 * route, the calculations, the UI) needs to know or care which one is live.
 */

export interface LeadStatusUpsertPatch {
  mainStatus: string;
  secondaryStatus: string;
  phone?: string | null;
  fullPaymentAmount?: number | null;
  partialPaymentAmount?: number | null;
}

export interface LeadStatusRepository {
  getAll(): Promise<Map<string, LeadStatusRecord>>;
  get(leadId: string): Promise<LeadStatusRecord | undefined>;
  /** Trusts its caller - validate against validation.ts's validateStatusUpdate() BEFORE calling this, not after. */
  upsert(leadId: string, patch: LeadStatusUpsertPatch): Promise<LeadStatusRecord>;
}

/** TEMPORARY / NON-PERSISTENT - see the file-level banner above. */
class InMemoryLeadStatusRepository implements LeadStatusRepository {
  private readonly store = new Map<string, LeadStatusRecord>();

  async getAll(): Promise<Map<string, LeadStatusRecord>> {
    return new Map(this.store);
  }

  async get(leadId: string): Promise<LeadStatusRecord | undefined> {
    return this.store.get(leadId);
  }

  async upsert(leadId: string, patch: LeadStatusUpsertPatch): Promise<LeadStatusRecord> {
    const existing = this.store.get(leadId) ?? defaultLeadStatusRecord(leadId, patch.phone ?? null);
    const next: LeadStatusRecord = {
      leadId,
      phone: patch.phone !== undefined ? patch.phone : existing.phone,
      mainStatus: patch.mainStatus as LeadStatusRecord["mainStatus"],
      secondaryStatus: patch.secondaryStatus,
      fullPaymentAmount: patch.fullPaymentAmount !== undefined ? patch.fullPaymentAmount : existing.fullPaymentAmount,
      partialPaymentAmount:
        patch.partialPaymentAmount !== undefined ? patch.partialPaymentAmount : existing.partialPaymentAmount,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(leadId, next);
    return next;
  }
}

const sharedInMemoryRepository = new InMemoryLeadStatusRepository();

/** Single point every caller goes through - see the swap-in note above for how this changes once a real database is configured. */
export function getLeadStatusRepository(): LeadStatusRepository {
  return sharedInMemoryRepository;
}
