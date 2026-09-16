import "server-only";

import { hashPhoneForCapi, sha256Hex } from "@/lib/meta-capi/hash";

export interface BuildLeadEventInput {
  /** This app's own internal_lead_id - hashed into external_id so Meta can de-duplicate/attribute without us ever sending a raw internal identifier. */
  internalLeadId: string;
  phone: string | null;
  email?: string | null;
  eventSourceUrl: string | null;
  /** Unix seconds. Defaults to now - only pass this explicitly when re-sending an event for a lead captured earlier (e.g. a backfill), never to backdate a live submission. */
  eventTime?: number;
  fbclid?: string | null;
  /** The real `_fbc` browser cookie value, when the caller has it - preferred over deriving one from fbclid. */
  fbc?: string | null;
  /** The real `_fbp` browser cookie value, when the caller has it. */
  fbp?: string | null;
}

export interface MetaCapiUserData {
  ph?: string[];
  em?: string[];
  external_id?: string[];
  fbc?: string;
  fbp?: string;
}

export interface MetaCapiLeadEvent {
  event_name: "Lead";
  event_time: number;
  event_source_url: string | null;
  action_source: "website";
  user_data: MetaCapiUserData;
}

/**
 * Meta's documented fallback for constructing `fbc` server-side from a click
 * ID when the browser hasn't set the `_fbc` cookie yet (e.g. the very first
 * pageview before the Pixel base code runs). Format: fb.<subdomain-index>.
 * <timestamp-ms>.<fbclid> - subdomain index 1 covers the common case (a
 * single domain / www subdomain), which is all this app's landing pages need.
 */
export function deriveFbcFromClickId(fbclid: string, timestampMs: number = Date.now()): string {
  return `fb.1.${timestampMs}.${fbclid}`;
}

/** Builds a standard Meta `Lead` event payload - never sent by this function itself, see send-event.ts. */
export function buildLeadEvent(input: BuildLeadEventInput): MetaCapiLeadEvent {
  const eventTime = input.eventTime ?? Math.floor(Date.now() / 1000);

  const userData: MetaCapiUserData = {
    external_id: [sha256Hex(input.internalLeadId)],
  };

  const hashedPhone = input.phone ? hashPhoneForCapi(input.phone) : null;
  if (hashedPhone) userData.ph = [hashedPhone];
  if (input.email) userData.em = [sha256Hex(input.email)];

  // Derived from the SAME instant as event_time, not the wall clock at build
  // time - otherwise re-building this event later for an older lead (a
  // retry, a backfill) would embed a synthetic "click happened just now"
  // timestamp that contradicts how long ago the lead itself says it was.
  const fbc = input.fbc ?? (input.fbclid ? deriveFbcFromClickId(input.fbclid, eventTime * 1000) : undefined);
  if (fbc) userData.fbc = fbc;
  if (input.fbp) userData.fbp = input.fbp;

  return {
    event_name: "Lead",
    event_time: eventTime,
    event_source_url: input.eventSourceUrl,
    action_source: "website",
    user_data: userData,
  };
}
