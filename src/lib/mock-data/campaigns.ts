import type { Ad, AdSet, Campaign, EntityStatus, LeadSourceType, RawMetrics } from "@/lib/types";

/**
 * Every ad is authored as a small set of "control knobs" (spend, cpm, ctr, cpl,
 * closeRate, aov, frequency) instead of hand-typed impressions/leads/sales/revenue.
 * The raw counters are *derived* from those knobs, so the numbers you see in the
 * performance table are always internally consistent with the formulas in
 * lib/calculations.ts (e.g. leads really is spend/cpl, revenue really is
 * sales * average order value) - important because this dataset intentionally
 * tells a specific story (cheap leads that don't close vs. pricier leads that do).
 *
 * Values are fixed (not random) so server and client render identical markup.
 */
interface AdSeed {
  id: string;
  name: string;
  status: EntityStatus;
  destinationType: LeadSourceType;
  spend: number;
  cpm: number;
  ctr: number; // percent
  frequency: number;
  cpl: number;
  closeRate: number; // percent
  aov: number; // average order value, drives revenue
}

function buildRawMetrics(seed: AdSeed): RawMetrics {
  const impressions = Math.round((seed.spend / seed.cpm) * 1000);
  const reach = Math.max(1, Math.round(impressions / seed.frequency));
  const linkClicks = Math.round(impressions * (seed.ctr / 100));
  const leads = Math.round(seed.spend / seed.cpl);
  const sales = Math.round(leads * (seed.closeRate / 100));
  const revenue = Math.round(sales * seed.aov);
  return { spend: seed.spend, impressions, reach, linkClicks, leads, sales, revenue };
}

function buildAd(seed: AdSeed, adSetId: string): Ad {
  return {
    id: seed.id,
    name: seed.name,
    adSetId,
    status: seed.status,
    destinationType: seed.destinationType,
    metrics: buildRawMetrics(seed),
  };
}

interface AdSetSeed {
  id: string;
  name: string;
  status: EntityStatus;
  ads: AdSeed[];
}

function buildAdSet(seed: AdSetSeed, campaignId: string): AdSet {
  return {
    id: seed.id,
    name: seed.name,
    campaignId,
    status: seed.status,
    ads: seed.ads.map((ad) => buildAd(ad, seed.id)),
  };
}

interface CampaignSeed {
  id: string;
  name: string;
  objective: string;
  status: EntityStatus;
  adSets: AdSetSeed[];
}

function buildCampaign(seed: CampaignSeed): Campaign {
  return {
    id: seed.id,
    name: seed.name,
    objective: seed.objective,
    status: seed.status,
    adSets: seed.adSets.map((adSet) => buildAdSet(adSet, seed.id)),
  };
}

/**
 * Ad set "as-ai-retargeting" under the AI campaign deliberately contains the three
 * "hero" ads referenced across the dashboard (KPI insights, README):
 *  - ad-ai-coupon   ("Ad A"): cheap leads (CPL 45), zero sales - a lead-volume trap.
 *  - ad-ai-video    ("Ad B"): pricier leads (CPL 85), high close rate, best cost/sale.
 *  - ad-ai-vip-call ("Ad C"): most expensive leads, but they close fast (see mock
 *    leads in leads.ts, all same-day / "one shot" for this ad).
 */
const CAMPAIGN_SEEDS: CampaignSeed[] = [
  {
    id: "camp-cyber",
    name: "קמפיין Cyber - הגנת סייבר",
    objective: "יצירת לידים",
    status: "active",
    adSets: [
      {
        id: "as-cyber-cold",
        name: "קהל קר - עניין באבטחת מידע",
        status: "active",
        ads: [
          {
            id: "ad-cyber-video-intro",
            name: "מודעה - וידאו: איך נכנסים לעולם הסייבר",
            status: "active",
            destinationType: "meta_rich_form",
            spend: 7200,
            cpm: 42,
            ctr: 1.8,
            frequency: 1.6,
            cpl: 60,
            closeRate: 9,
            aov: 11000,
          },
          {
            id: "ad-cyber-carousel-tracks",
            name: "מודעה - קרוסלה מסלולי לימוד",
            status: "active",
            destinationType: "meta_standard_form",
            spend: 5400,
            cpm: 38,
            ctr: 1.3,
            frequency: 1.9,
            cpl: 72,
            closeRate: 6,
            aov: 11000,
          },
          {
            id: "ad-cyber-static-discount",
            name: "מודעה - באנר סטטי הנחה למתקדמים",
            status: "paused",
            destinationType: "landing_page",
            spend: 2100,
            cpm: 45,
            ctr: 0.9,
            frequency: 2.3,
            cpl: 95,
            closeRate: 4,
            aov: 11500,
          },
        ],
      },
      {
        id: "as-cyber-lookalike",
        name: "Lookalike 1% - בוגרי קורסים קודמים",
        status: "active",
        ads: [
          {
            id: "ad-cyber-testimonial",
            name: "מודעה - טסטימוניאל בוגר Cyber",
            status: "active",
            destinationType: "meta_rich_form",
            spend: 6300,
            cpm: 40,
            ctr: 2.1,
            frequency: 1.5,
            cpl: 58,
            closeRate: 14,
            aov: 11500,
          },
          {
            id: "ad-cyber-vip-call",
            name: "מודעה - שיחת ייעוץ אישית",
            status: "active",
            destinationType: "landing_page",
            spend: 4800,
            cpm: 48,
            ctr: 1.1,
            frequency: 1.8,
            cpl: 110,
            closeRate: 18,
            aov: 12000,
          },
        ],
      },
    ],
  },
  {
    id: "camp-ai",
    name: "קמפיין AI - בינה מלאכותית",
    objective: "יצירת לידים",
    status: "active",
    adSets: [
      {
        id: "as-ai-retargeting",
        name: "רימרקטינג - מבקרים באתר (30 יום)",
        status: "active",
        ads: [
          {
            id: "ad-ai-coupon",
            name: "מודעה - קופון הנחה 500 ש״ח",
            status: "active",
            destinationType: "meta_standard_form",
            spend: 9000,
            cpm: 30,
            ctr: 2.4,
            frequency: 2.8,
            cpl: 45,
            closeRate: 0,
            aov: 12500,
          },
          {
            id: "ad-ai-video",
            name: "מודעה - וידאו טסטימוניאל בוגר מוצלח",
            status: "active",
            destinationType: "meta_rich_form",
            spend: 8500,
            cpm: 55,
            ctr: 1.4,
            frequency: 1.7,
            cpl: 85,
            closeRate: 22,
            aov: 13500,
          },
          {
            id: "ad-ai-vip-call",
            name: "מודעה - שיחת ייעוץ טלפונית VIP",
            status: "active",
            destinationType: "landing_page",
            spend: 6000,
            cpm: 65,
            ctr: 1.0,
            frequency: 1.4,
            cpl: 150,
            closeRate: 15,
            aov: 15000,
          },
        ],
      },
      {
        id: "as-ai-cold",
        name: "קהל קר - מפתחים ומתעניינים בטכנולוגיה",
        status: "active",
        ads: [
          {
            id: "ad-ai-carousel-explainer",
            name: "מודעה - קרוסלה: מהי בינה מלאכותית יישומית",
            status: "active",
            destinationType: "meta_standard_form",
            spend: 5000,
            cpm: 44,
            ctr: 1.6,
            frequency: 2.0,
            cpl: 68,
            closeRate: 8,
            aov: 12500,
          },
          {
            id: "ad-ai-webinar",
            name: "מודעה - וובינר חינם: כניסה ל-AI",
            status: "paused",
            destinationType: "meta_rich_form",
            spend: 3200,
            cpm: 39,
            ctr: 2.0,
            frequency: 1.9,
            cpl: 54,
            closeRate: 5,
            aov: 12000,
          },
        ],
      },
    ],
  },
  {
    id: "camp-fullstack",
    name: "קמפיין Full Stack - פיתוח תוכנה",
    objective: "יצירת לידים",
    status: "active",
    adSets: [
      {
        id: "as-fullstack-cold",
        name: "קהל קר - מעוניינים בפיתוח תוכנה",
        status: "active",
        ads: [
          {
            id: "ad-fullstack-day-in-life",
            name: "מודעה - וידאו: יום בחיים של מפתח/ת",
            status: "active",
            destinationType: "meta_rich_form",
            spend: 6800,
            cpm: 41,
            ctr: 1.7,
            frequency: 1.7,
            cpl: 62,
            closeRate: 10,
            aov: 10500,
          },
          {
            id: "ad-fullstack-evening-track",
            name: "מודעה - באנר סטטי מסלול ערב",
            status: "active",
            destinationType: "meta_standard_form",
            spend: 4100,
            cpm: 37,
            ctr: 1.2,
            frequency: 2.1,
            cpl: 78,
            closeRate: 7,
            aov: 10500,
          },
          {
            id: "ad-fullstack-tech-carousel",
            name: "מודעה - קרוסלה טכנולוגיות נלמדות",
            status: "ended",
            destinationType: "landing_page",
            spend: 1800,
            cpm: 43,
            ctr: 1.0,
            frequency: 2.4,
            cpl: 90,
            closeRate: 3,
            aov: 10000,
          },
        ],
      },
      {
        id: "as-fullstack-lookalike",
        name: "Lookalike 1% - נרשמים לניוזלטר",
        status: "active",
        ads: [
          {
            id: "ad-fullstack-testimonial",
            name: "מודעה - טסטימוניאל בוגרת Full Stack",
            status: "active",
            destinationType: "meta_rich_form",
            spend: 5600,
            cpm: 46,
            ctr: 1.9,
            frequency: 1.6,
            cpl: 64,
            closeRate: 16,
            aov: 11000,
          },
        ],
      },
    ],
  },
  {
    id: "camp-digital-marketing",
    name: "קמפיין שיווק דיגיטלי",
    objective: "יצירת לידים",
    status: "active",
    adSets: [
      {
        id: "as-dm-cold-women",
        name: "קהל קר - נשים 25-40 בחיפוש קריירה חדשה",
        status: "active",
        ads: [
          {
            id: "ad-dm-career-switch",
            name: "מודעה - וידאו: מעבר קריירה לשיווק דיגיטלי",
            status: "active",
            destinationType: "meta_rich_form",
            spend: 5200,
            cpm: 33,
            ctr: 2.2,
            frequency: 2.0,
            cpl: 40,
            closeRate: 5,
            aov: 8500,
          },
          {
            id: "ad-dm-tools-carousel",
            name: "מודעה - קרוסלה כלים שנלמדים בקורס",
            status: "active",
            destinationType: "meta_standard_form",
            spend: 3900,
            cpm: 31,
            ctr: 1.8,
            frequency: 2.3,
            cpl: 48,
            closeRate: 6,
            aov: 8500,
          },
        ],
      },
      {
        id: "as-dm-retargeting-form",
        name: "רימרקטינג - נטשו טופס הרשמה",
        status: "active",
        ads: [
          {
            id: "ad-dm-reminder",
            name: "מודעה - תזכורת הרשמה + הטבה",
            status: "active",
            destinationType: "landing_page",
            spend: 2600,
            cpm: 36,
            ctr: 1.5,
            frequency: 3.1,
            cpl: 52,
            closeRate: 20,
            aov: 9000,
          },
          {
            id: "ad-dm-faq",
            name: "מודעה - שאלות ותשובות על הקורס",
            status: "paused",
            destinationType: "meta_standard_form",
            spend: 1500,
            cpm: 34,
            ctr: 1.3,
            frequency: 2.6,
            cpl: 60,
            closeRate: 9,
            aov: 8500,
          },
        ],
      },
    ],
  },
  {
    id: "camp-general-hightech",
    name: "קמפיין הייטק כללי",
    objective: "מודעות + לידים",
    status: "paused",
    adSets: [
      {
        id: "as-general-broad",
        name: "קהל קר - רחב, מתעניינים בהייטק (22-45)",
        status: "paused",
        ads: [
          {
            id: "ad-general-intro-video",
            name: "מודעה - וידאו כללי: כניסה להייטק",
            status: "paused",
            destinationType: "meta_standard_form",
            spend: 3300,
            cpm: 29,
            ctr: 1.1,
            frequency: 2.5,
            cpl: 55,
            closeRate: 4,
            aov: 9500,
          },
          {
            id: "ad-general-all-tracks",
            name: "מודעה - קרוסלה כל המסלולים",
            status: "paused",
            destinationType: "meta_rich_form",
            spend: 2400,
            cpm: 32,
            ctr: 0.9,
            frequency: 2.7,
            cpl: 70,
            closeRate: 3,
            aov: 9500,
          },
        ],
      },
      {
        id: "as-general-lookalike",
        name: "Lookalike 2% - כלל הלידים ב-90 יום",
        status: "active",
        ads: [
          {
            id: "ad-general-brand-banner",
            name: "מודעה - באנר גנרי מכללת Ecom",
            status: "active",
            destinationType: "landing_page",
            spend: 4700,
            cpm: 35,
            ctr: 1.4,
            frequency: 1.9,
            cpl: 58,
            closeRate: 8,
            aov: 9800,
          },
        ],
      },
    ],
  },
];

export const campaigns: Campaign[] = CAMPAIGN_SEEDS.map(buildCampaign);

export const allAdSets: AdSet[] = campaigns.flatMap((c) => c.adSets);
export const allAds: Ad[] = allAdSets.flatMap((as) => as.ads);

export function findCampaign(campaignId: string) {
  return campaigns.find((c) => c.id === campaignId);
}

export function findAdSet(adSetId: string) {
  return allAdSets.find((as) => as.id === adSetId);
}

export function findAd(adId: string) {
  return allAds.find((ad) => ad.id === adId);
}
