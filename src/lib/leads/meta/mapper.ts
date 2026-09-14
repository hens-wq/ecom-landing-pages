import { parseLeadContact } from "@/lib/leads/meta/field-data";
import type { MetaLeadgenNode } from "@/lib/leads/meta/types";
import { normalizeIsraeliPhone } from "@/lib/phone";
import type { MetaFormLead } from "@/lib/leads/types";

export function mapMetaLeadgenNode(node: MetaLeadgenNode): MetaFormLead {
  const contact = parseLeadContact(node.field_data);

  return {
    id: node.id,
    createdTime: node.created_time,
    name: contact.name,
    phone: contact.phone,
    normalizedPhone: contact.phone ? normalizeIsraeliPhone(contact.phone) : null,
    email: contact.email,
    formId: node.form_id ?? "",
    campaignId: node.campaign_id ?? "",
    campaignName: node.campaign_name ?? "",
    adSetId: node.adset_id ?? "",
    adSetName: node.adset_name ?? "",
    adId: node.ad_id ?? "",
    adName: node.ad_name ?? "",
    // See lib/leads/types.ts - form richness isn't available without an extra
    // per-form call, out of scope for this phase.
    sourceType: "unknown",
  };
}
