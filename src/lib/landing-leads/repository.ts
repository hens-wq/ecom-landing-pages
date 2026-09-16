import "server-only";

import { randomUUID } from "node:crypto";

import { startOfDayUnixMs } from "@/lib/advertising/timezone";
import { ensureSchema, getSqlClient, wrapDatabaseError } from "@/lib/landing-leads/db";
import type { LandingLeadInput, LandingLeadRecord } from "@/lib/landing-leads/types";
import { normalizeIsraeliPhone } from "@/lib/phone";

interface LandingLeadRow {
  internal_lead_id: string;
  meta_lead_id: string | null;
  name: string | null;
  phone: string | null;
  normalized_phone: string | null;
  email: string | null;
  campaign_id: string | null;
  adset_id: string | null;
  ad_id: string | null;
  landing_page_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  placement: string | null;
  site_source: string | null;
  submitted_at: string;
  created_at: string;
}

function mapRow(row: LandingLeadRow): LandingLeadRecord {
  return {
    internalLeadId: row.internal_lead_id,
    leadSource: "landing_page",
    metaLeadId: row.meta_lead_id,
    createdAt: row.created_at,
    submittedAt: row.submitted_at,
    name: row.name,
    phone: row.phone,
    normalizedPhone: row.normalized_phone,
    email: row.email,
    campaignId: row.campaign_id,
    adSetId: row.adset_id,
    adId: row.ad_id,
    landingPageUrl: row.landing_page_url,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmContent: row.utm_content,
    utmTerm: row.utm_term,
    fbclid: row.fbclid,
    placement: row.placement,
    siteSource: row.site_source,
  };
}

const INSERT_SQL = `
  INSERT INTO leads (
    internal_lead_id, lead_source, meta_lead_id, name, phone, normalized_phone, email,
    campaign_id, adset_id, ad_id, landing_page_url,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    fbclid, placement, site_source, submitted_at, created_at
  )
  VALUES (
    $1, 'landing_page', NULL, $2, $3, $4, $5,
    $6, $7, $8, $9,
    $10, $11, $12, $13, $14,
    $15, $16, $17, $18, now()
  )
  RETURNING *
`;

/** Every landing-page lead this app has ever received - append-only, never updated by this repository (status/payment edits go through lib/lead-status, keyed by internalLeadId - see app/leads/page.tsx). */
export async function insertLandingLead(input: LandingLeadInput): Promise<LandingLeadRecord> {
  try {
    await ensureSchema();
    const sql = getSqlClient();
    const internalLeadId = randomUUID();
    const normalizedPhone = normalizeIsraeliPhone(input.phone) || null;
    const submittedAt = input.submittedAt ?? new Date().toISOString();

    const rows = (await sql.query(INSERT_SQL, [
      internalLeadId,
      input.name,
      input.phone,
      normalizedPhone,
      input.email ?? null,
      input.campaignId ?? null,
      input.adSetId ?? null,
      input.adId ?? null,
      input.landingPageUrl ?? null,
      input.utmSource ?? null,
      input.utmMedium ?? null,
      input.utmCampaign ?? null,
      input.utmContent ?? null,
      input.utmTerm ?? null,
      input.fbclid ?? null,
      input.placement ?? null,
      input.siteSource ?? null,
      submittedAt,
    ])) as LandingLeadRow[];

    return mapRow(rows[0]);
  } catch (error) {
    throw wrapDatabaseError(error, "שגיאה בשמירת הליד ממסד הנתונים. הליד לא נשמר בדשבורד.");
  }
}

/**
 * Leads whose submitted_at falls within [sinceIso, untilIso] (inclusive
 * calendar days). Boundaries are computed via startOfDayUnixMs
 * (lib/advertising/timezone.ts) - the same Asia/Jerusalem-aware day-boundary
 * math the rest of the app's date-range filtering uses - and passed down as
 * absolute UTC instants, never left to Postgres's own date casting (which
 * would use its session timezone, not REPORTING_TIMEZONE, and silently
 * reintroduce the exact "Today" timezone bug fixed elsewhere in this app).
 */
export async function getLandingLeadsInRange(sinceIso: string, untilIso: string): Promise<LandingLeadRecord[]> {
  try {
    await ensureSchema();
    const sql = getSqlClient();
    const sinceInstant = new Date(startOfDayUnixMs(sinceIso)).toISOString();
    const untilInstant = new Date(startOfDayUnixMs(untilIso) + 24 * 60 * 60 * 1000).toISOString();
    const rows = (await sql`
      SELECT * FROM leads
      WHERE lead_source = 'landing_page'
        AND submitted_at >= ${sinceInstant}::timestamptz
        AND submitted_at < ${untilInstant}::timestamptz
      ORDER BY submitted_at DESC
    `) as LandingLeadRow[];
    return rows.map(mapRow);
  } catch (error) {
    throw wrapDatabaseError(error, "שגיאה בטעינת לידים מדף נחיתה ממסד הנתונים.");
  }
}
