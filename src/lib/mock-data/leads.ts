import type { Lead } from "@/lib/types";
import { normalizeIsraeliPhone } from "@/lib/phone";
import { findAd, findAdSet, findCampaign } from "@/lib/mock-data/campaigns";

/** Attribution (IDs + display names + source) is always looked up from the real Ad record - never hand-typed per lead, so it can't drift out of sync. */
function attributionFor(adId: string) {
  const ad = findAd(adId);
  if (!ad) throw new Error(`Unknown ad id in leads seed: ${adId}`);
  const adSet = findAdSet(ad.adSetId);
  if (!adSet) throw new Error(`Unknown ad set for ad ${adId}`);
  const campaign = findCampaign(adSet.campaignId);
  if (!campaign) throw new Error(`Unknown campaign for ad set ${adSet.id}`);
  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    adSetId: adSet.id,
    adSetName: adSet.name,
    adId: ad.id,
    adName: ad.name,
    sourceType: ad.destinationType,
  };
}

interface LeadSeed {
  id: string;
  name: string;
  /** Deliberately varied raw formats (spaces/dashes/+972/972) to exercise phone normalization. */
  phone: string;
  leadDateIso: string; // full date + time
  adId: string;
  withClickTracking?: boolean;
}

/** Deterministic placeholder Meta click-tracking values - Phase 2 will populate these from the real pixel/CAPI. */
function trackingFields(seed: LeadSeed) {
  if (!seed.withClickTracking) return {};
  const stamp = Math.floor(new Date(seed.leadDateIso).getTime() / 1000);
  const fbclid = `IwAR${seed.id.replace(/\D/g, "").padStart(4, "0")}mockClickId`;
  return {
    fbclid,
    fbc: `fb.1.${stamp}.${fbclid}`,
    fbp: `fb.1.${stamp}.${stamp % 1000000}`,
  };
}

/**
 * Builds a lead with NO sale outcome baked in - saleStatus/saleDate/saleAmount/
 * timeToSale* are always "not sold yet" here. The real outcome (which lead, if
 * any, a sale gets attributed to) is decided once, by the matching engine, in
 * leads-with-outcomes.ts. Authoring it twice (once here, once in sales.ts) is
 * exactly the kind of duplication that drifts out of sync.
 */
function buildLead(seed: LeadSeed): Lead {
  const attribution = attributionFor(seed.adId);

  return {
    id: seed.id,
    name: seed.name,
    phone: seed.phone,
    normalizedPhone: normalizeIsraeliPhone(seed.phone),
    leadDate: seed.leadDateIso,
    ...attribution,
    ...trackingFields(seed),
    saleStatus: "not_sold",
  };
}

// "Today" for this mock dataset is 2026-09-10 - all lead/sale dates fall within the trailing 30 days.
const LEAD_SEEDS: LeadSeed[] = [
  // --- Ad A "מודעה - קופון הנחה 500 ש״ח" (ad-ai-coupon): many cheap leads, essentially zero sales ---
  { id: "lead-001", name: "יובל כהן", phone: "0521234567", leadDateIso: "2026-08-20T09:15:00Z", adId: "ad-ai-coupon" },
  { id: "lead-002", name: "מאיה לוי", phone: "052-234-5678", leadDateIso: "2026-08-21T14:40:00Z", adId: "ad-ai-coupon" },
  { id: "lead-003", name: "עידן ברק", phone: "+972-53-345-6789", leadDateIso: "2026-08-22T11:05:00Z", adId: "ad-ai-coupon" },
  { id: "lead-004", name: "נועה שרון", phone: "972544567890", leadDateIso: "2026-08-23T19:22:00Z", adId: "ad-ai-coupon" },

  // --- Ad B "מודעה - וידאו טסטימוניאל בוגר מוצלח" (ad-ai-video): pricier leads, high close rate ---
  { id: "lead-005", name: "דניאל אברג׳יל", phone: "0541122334", leadDateIso: "2026-08-15T10:00:00Z", adId: "ad-ai-video" },
  { id: "lead-006", name: "שירה גולן", phone: "054-223-3445", leadDateIso: "2026-08-16T08:30:00Z", adId: "ad-ai-video" },
  { id: "lead-007", name: "אורי פרידמן", phone: "+972521237654", leadDateIso: "2026-08-18T13:10:00Z", adId: "ad-ai-video" },
  { id: "lead-008", name: "טל מזרחי", phone: "0587654321", leadDateIso: "2026-08-20T09:00:00Z", adId: "ad-ai-video" },

  // --- Ad C "מודעה - שיחת ייעוץ טלפונית VIP" (ad-ai-vip-call): expensive leads, fast/one-shot sales ---
  { id: "lead-009", name: "רועי אשכנזי", phone: "0501234567", leadDateIso: "2026-08-25T10:00:00Z", adId: "ad-ai-vip-call", withClickTracking: true },
  { id: "lead-010", name: "ליאור בן דוד", phone: "050-987-6543", leadDateIso: "2026-08-26T11:30:00Z", adId: "ad-ai-vip-call", withClickTracking: true },
  { id: "lead-011", name: "הדר וייס", phone: "+972508765432", leadDateIso: "2026-08-27T09:45:00Z", adId: "ad-ai-vip-call", withClickTracking: true },

  // --- Other campaigns: Cyber ---
  { id: "lead-012", name: "אלון רזניק", phone: "0521112233", leadDateIso: "2026-08-14T08:00:00Z", adId: "ad-cyber-video-intro" },
  { id: "lead-013", name: "קרן שמעוני", phone: "052-333-4455", leadDateIso: "2026-08-17T09:00:00Z", adId: "ad-cyber-testimonial" },
  { id: "lead-014", name: "גיא נחום", phone: "0587778899", leadDateIso: "2026-08-19T12:00:00Z", adId: "ad-cyber-vip-call", withClickTracking: true },
  { id: "lead-020", name: "שני מלכה", phone: "058-700-2233", leadDateIso: "2026-09-03T11:00:00Z", adId: "ad-cyber-carousel-tracks" },

  // --- Multiple leads, same phone: "חן סויסה" clicks into Cyber twice from different ads before
  // eventually buying (see sales.ts, sale-016). Both records are kept - the matching engine picks
  // whichever one is the most recent lead at or before the sale date (lead-022, not lead-021). ---
  { id: "lead-021", name: "חן סויסה", phone: "0529012345", leadDateIso: "2026-09-01T09:00:00Z", adId: "ad-cyber-carousel-tracks" },
  { id: "lead-022", name: "חן סויסה", phone: "052-901-2345", leadDateIso: "2026-09-08T14:00:00Z", adId: "ad-cyber-testimonial" },

  // --- "Needs review" case: this lead is dated AFTER the sale that shares its phone number
  // (sale-017 in sales.ts) - there is no valid prior lead to attribute that sale to. ---
  { id: "lead-023", name: "אלה רובין", phone: "0563345566", leadDateIso: "2026-09-08T10:00:00Z", adId: "ad-dm-tools-carousel" },

  // --- Other campaigns: Full Stack ---
  { id: "lead-015", name: "עדי כספי", phone: "0541231234", leadDateIso: "2026-08-22T15:00:00Z", adId: "ad-fullstack-testimonial" },
  { id: "lead-016", name: "יעל אזולאי", phone: "054-321-0987", leadDateIso: "2026-08-24T10:00:00Z", adId: "ad-fullstack-day-in-life" },

  // --- Other campaigns: Digital Marketing ---
  { id: "lead-017", name: "משה טל", phone: "0501112222", leadDateIso: "2026-08-28T08:00:00Z", adId: "ad-dm-reminder", withClickTracking: true },
  { id: "lead-018", name: "רותם שני", phone: "050-222-3333", leadDateIso: "2026-08-29T09:30:00Z", adId: "ad-dm-career-switch" },

  // --- Other campaigns: General High-Tech ---
  { id: "lead-019", name: "בן חדד", phone: "0587001122", leadDateIso: "2026-09-01T10:00:00Z", adId: "ad-general-brand-banner", withClickTracking: true },
];

export const leads: Lead[] = LEAD_SEEDS.map(buildLead);

export function findLeadById(leadId: string) {
  return leads.find((lead) => lead.id === leadId);
}
