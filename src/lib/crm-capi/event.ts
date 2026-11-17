import { isTooOld } from "@/lib/crm-capi/policy";
import { CRM_LEAD_EVENT_SOURCE, QUALIFIED_EVENT_NAME, RAW_EVENT_NAME, REGISTERED_EVENT_NAME } from "@/lib/crm-capi/config";
import type { CrmEventType } from "@/lib/crm-capi/rules";

/**
 * One Meta CRM (lead-stage) event. Pure.
 *
 * This is NOT a website event. action_source is "system_generated", the event
 * names are CRM stage names (never "Lead"), and the identifier is the Meta Lead
 * ID itself, sent as user_data.lead_id. No email or phone is included.
 *
 * Checked against Meta's Conversion Leads payload specification: event_name is
 * free text, custom_data carries event_source "crm" and lead_event_source (the
 * CRM's name), and lead_id is the 15 to 17 digit leadgen_id. lead_id is sent as a
 * string, because IDs above 2^53 cannot be held exactly as a JSON number.
 *
 * test_event_code is a request-level field, not part of the event (see send.ts).
 */

/** Meta Lead IDs are 15 to 17 digits. Anything else is not a Meta lead and is never sent as one. */
export const META_LEAD_ID_PATTERN = /^\d{15,17}$/;

export interface CrmMetaEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: "system_generated";
  user_data: { lead_id: string };
  custom_data: { event_source: "crm"; lead_event_source: string };
}

export interface BuildCrmEventInput {
  eventType: CrmEventType;
  metaLeadId: string;
  /** When the status changed: the CRM's own time, or the arrival time of the webhook. */
  eventTime: Date;
  now: Date;
}

export type BuildCrmEventResult =
  | { ok: true; event: CrmMetaEvent }
  | { ok: false; reason: "invalid_meta_lead_id" | "event_too_old" };

/** Stable per lead and event type, so a retry sends the same event_id. */
export function crmEventId(eventType: CrmEventType, metaLeadId: string): string {
  return `crm:${eventType}:${metaLeadId}`;
}

const EVENT_NAMES: Record<CrmEventType, string> = {
  raw: RAW_EVENT_NAME,
  qualified: QUALIFIED_EVENT_NAME,
  registered: REGISTERED_EVENT_NAME,
};

export function buildCrmEvent(input: BuildCrmEventInput): BuildCrmEventResult {
  if (!META_LEAD_ID_PATTERN.test(input.metaLeadId)) return { ok: false, reason: "invalid_meta_lead_id" };

  // A timestamp in the future (clock skew, or a bad value from the CRM) is sent as "now", never refused.
  const effective = input.eventTime.getTime() > input.now.getTime() ? input.now : input.eventTime;
  if (isTooOld(effective, input.now)) return { ok: false, reason: "event_too_old" };

  return {
    ok: true,
    event: {
      event_name: EVENT_NAMES[input.eventType],
      event_time: Math.floor(effective.getTime() / 1000),
      event_id: crmEventId(input.eventType, input.metaLeadId),
      action_source: "system_generated",
      user_data: { lead_id: input.metaLeadId },
      custom_data: { event_source: "crm", lead_event_source: CRM_LEAD_EVENT_SOURCE },
    },
  };
}
