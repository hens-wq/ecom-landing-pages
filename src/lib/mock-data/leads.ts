import type { Lead, SourceType } from "@/lib/types";
import { calcTimeToSaleDays, timeToSaleBucket } from "@/lib/calculations";
import { normalizeIsraeliPhone } from "@/lib/phone";
import { findAd, findAdSet, findCampaign } from "@/lib/mock-data/campaigns";

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
  };
}

interface LeadSeed {
  id: string;
  name: string;
  /** Deliberately varied raw formats (spaces/dashes/+972/972) to exercise phone normalization. */
  phone: string;
  leadDateIso: string;
  adId: string;
  sourceType: SourceType;
  withClickTracking?: boolean;
  saleDateIso?: string;
  saleAmount?: number;
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

function buildLead(seed: LeadSeed): Lead {
  const attribution = attributionFor(seed.adId);
  const timeToSaleDays = seed.saleDateIso ? calcTimeToSaleDays(seed.leadDateIso, seed.saleDateIso) : null;

  return {
    id: seed.id,
    name: seed.name,
    phone: seed.phone,
    normalizedPhone: normalizeIsraeliPhone(seed.phone),
    leadDate: seed.leadDateIso,
    ...attribution,
    sourceType: seed.sourceType,
    ...trackingFields(seed),
    saleStatus: seed.saleDateIso ? "sold" : "not_sold",
    saleDate: seed.saleDateIso,
    saleAmount: seed.saleAmount,
    timeToSaleDays,
    timeToSaleBucket: timeToSaleBucket(timeToSaleDays),
  };
}

// "Today" for this mock dataset is 2026-09-10 - all lead/sale dates fall within the trailing 30 days.
const LEAD_SEEDS: LeadSeed[] = [
  // --- Ad A "מודעה - קופון הנחה 500 ש״ח" (ad-ai-coupon): many cheap leads, essentially zero sales ---
  { id: "lead-001", name: "יובל כהן", phone: "0521234567", leadDateIso: "2026-08-20T09:15:00Z", adId: "ad-ai-coupon", sourceType: "meta_form" },
  { id: "lead-002", name: "מאיה לוי", phone: "052-234-5678", leadDateIso: "2026-08-21T14:40:00Z", adId: "ad-ai-coupon", sourceType: "meta_form" },
  { id: "lead-003", name: "עידן ברק", phone: "+972-53-345-6789", leadDateIso: "2026-08-22T11:05:00Z", adId: "ad-ai-coupon", sourceType: "meta_form" },
  { id: "lead-004", name: "נועה שרון", phone: "972544567890", leadDateIso: "2026-08-23T19:22:00Z", adId: "ad-ai-coupon", sourceType: "meta_form" },

  // --- Ad B "מודעה - וידאו טסטימוניאל בוגר מוצלח" (ad-ai-video): pricier leads, high close rate ---
  { id: "lead-005", name: "דניאל אברג׳יל", phone: "0541122334", leadDateIso: "2026-08-15T10:00:00Z", adId: "ad-ai-video", sourceType: "meta_form", saleDateIso: "2026-08-19T16:00:00Z", saleAmount: 13500 },
  { id: "lead-006", name: "שירה גולן", phone: "054-223-3445", leadDateIso: "2026-08-16T08:30:00Z", adId: "ad-ai-video", sourceType: "meta_form", saleDateIso: "2026-08-17T12:00:00Z", saleAmount: 13500 },
  { id: "lead-007", name: "אורי פרידמן", phone: "+972521237654", leadDateIso: "2026-08-18T13:10:00Z", adId: "ad-ai-video", sourceType: "meta_form", saleDateIso: "2026-08-18T18:45:00Z", saleAmount: 14000 },
  { id: "lead-008", name: "טל מזרחי", phone: "0587654321", leadDateIso: "2026-08-20T09:00:00Z", adId: "ad-ai-video", sourceType: "meta_form" },

  // --- Ad C "מודעה - שיחת ייעוץ טלפונית VIP" (ad-ai-vip-call): expensive leads, fast/one-shot sales ---
  { id: "lead-009", name: "רועי אשכנזי", phone: "0501234567", leadDateIso: "2026-08-25T10:00:00Z", adId: "ad-ai-vip-call", sourceType: "landing_page", withClickTracking: true, saleDateIso: "2026-08-25T13:15:00Z", saleAmount: 15000 },
  { id: "lead-010", name: "ליאור בן דוד", phone: "050-987-6543", leadDateIso: "2026-08-26T11:30:00Z", adId: "ad-ai-vip-call", sourceType: "landing_page", withClickTracking: true, saleDateIso: "2026-08-26T15:00:00Z", saleAmount: 15500 },
  { id: "lead-011", name: "הדר וייס", phone: "+972508765432", leadDateIso: "2026-08-27T09:45:00Z", adId: "ad-ai-vip-call", sourceType: "landing_page", withClickTracking: true },

  // --- Other campaigns: Cyber ---
  { id: "lead-012", name: "אלון רזניק", phone: "0521112233", leadDateIso: "2026-08-14T08:00:00Z", adId: "ad-cyber-video-intro", sourceType: "meta_form", saleDateIso: "2026-08-16T10:00:00Z", saleAmount: 11000 },
  { id: "lead-013", name: "קרן שמעוני", phone: "052-333-4455", leadDateIso: "2026-08-17T09:00:00Z", adId: "ad-cyber-testimonial", sourceType: "meta_form", saleDateIso: "2026-08-17T20:00:00Z", saleAmount: 11500 },
  { id: "lead-014", name: "גיא נחום", phone: "0587778899", leadDateIso: "2026-08-19T12:00:00Z", adId: "ad-cyber-vip-call", sourceType: "landing_page", withClickTracking: true, saleDateIso: "2026-08-28T09:00:00Z", saleAmount: 12000 },
  { id: "lead-020", name: "שני מלכה", phone: "058-700-2233", leadDateIso: "2026-09-03T11:00:00Z", adId: "ad-cyber-carousel-tracks", sourceType: "meta_form" },

  // --- Other campaigns: Full Stack ---
  { id: "lead-015", name: "עדי כספי", phone: "0541231234", leadDateIso: "2026-08-22T15:00:00Z", adId: "ad-fullstack-testimonial", sourceType: "meta_form", saleDateIso: "2026-08-24T11:00:00Z", saleAmount: 11000 },
  { id: "lead-016", name: "יעל אזולאי", phone: "054-321-0987", leadDateIso: "2026-08-24T10:00:00Z", adId: "ad-fullstack-day-in-life", sourceType: "meta_form" },

  // --- Other campaigns: Digital Marketing ---
  { id: "lead-017", name: "משה טל", phone: "0501112222", leadDateIso: "2026-08-28T08:00:00Z", adId: "ad-dm-reminder", sourceType: "landing_page", withClickTracking: true, saleDateIso: "2026-08-28T14:00:00Z", saleAmount: 9000 },
  { id: "lead-018", name: "רותם שני", phone: "050-222-3333", leadDateIso: "2026-08-29T09:30:00Z", adId: "ad-dm-career-switch", sourceType: "meta_form" },

  // --- Other campaigns: General High-Tech ---
  { id: "lead-019", name: "בן חדד", phone: "0587001122", leadDateIso: "2026-09-01T10:00:00Z", adId: "ad-general-brand-banner", sourceType: "landing_page", withClickTracking: true, saleDateIso: "2026-09-05T10:00:00Z", saleAmount: 9800 },
];

export const leads: Lead[] = LEAD_SEEDS.map(buildLead);

export function findLeadById(leadId: string) {
  return leads.find((lead) => lead.id === leadId);
}
