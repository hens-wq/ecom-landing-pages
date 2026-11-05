// Shared helpers for the browser tests. Only synthetic fixtures: no names, phone numbers or real account data.
// Browser checks for the Leads page and its agreement with the dashboard (scratch test, not part of the repo).
// The lead lists, statuses and lead facts are route mocks built from one fixture. Spend and campaigns come from the real server in demo mode.
const { chromium } = require("playwright");
const path = require("node:path");

const SCR = process.env.SCR;
const BASE = process.env.BASE_URL || "http://localhost:3100";
const DAY = "2026-11-03";
const DESKTOP = { width: 1280, height: 900 };

const ADS = [
  { campaignId: "camp-ai", campaignName: "קמפיין AI - בינה מלאכותית", adSetId: "as-ai-retargeting", adSetName: "רימרקטינג - מבקרים באתר (30 יום)", adId: "ad-ai-coupon", adName: "מודעה - קופון הנחה 500 ש״ח" },
  { campaignId: "camp-cyber", campaignName: "קמפיין Cyber - הגנת סייבר", adSetId: "as-cyber-cold", adSetName: "קהל קר - עניין באבטחת מידע", adId: "ad-cyber-video-intro", adName: "מודעה - וידאו: איך נכנסים לעולם הסייבר" },
  { campaignId: "camp-fullstack", campaignName: "קמפיין Full Stack - פיתוח תוכנה", adSetId: "as-fullstack-cold", adSetName: "קהל קר - מעוניינים בפיתוח תוכנה", adId: "ad-fullstack-day-in-life", adName: "מודעה - וידאו: יום בחיים של מפתח/ת" },
];
const UNKNOWN_AD = { campaignId: "camp-gone", campaignName: "קמפיין לא ידוע", adSetId: "as-gone", adSetName: "סדרה לא ידועה", adId: "ad-gone", adName: "מודעה לא ידועה" };

// main/secondary are real Ecom labels. `hasRecord: false` means no saved status, so the page uses the default "חדש".
// Expected quality: green = 1,2,3,4,5,12 (6); red = 6,7,11 (3); pending = 8,9 (2); unmapped = 10 (1).
// Expected sales = 1,2,3,12 (4); revenue = 1000 + 500 + 0 + 2000 = 3500.
const FIXTURE = [
  { main: "נרשם", secondary: "תשלום מלא", full: 1000, partial: null, source: "meta_standard_form" },
  { main: "נרשם", secondary: "תשלום חלקי", full: null, partial: 500, source: "meta_rich_form" },
  { main: "נרשם", secondary: "נרשם", full: null, partial: null, source: "meta_standard_form" },
  { main: "בתהליך", secondary: "בתהליך", full: null, partial: null, source: "meta_standard_form" },
  { main: "לא מעוניין", secondary: 'ל"מ - מחיר יקר', full: null, partial: null, source: "meta_rich_form" },
  { main: "לא מעוניין", secondary: 'ל"מ - לא מעוניין ללמוד הייטק', full: null, partial: null, source: "meta_standard_form" },
  { main: "ליד שגוי", secondary: "ליד שגוי - מס' טלפון שגוי", full: null, partial: null, source: "meta_standard_form" },
  { main: "DATA", secondary: "דאטה", full: null, partial: null, source: "meta_rich_form" },
  { main: "חדש", secondary: "חדש", full: null, partial: null, source: "meta_standard_form", hasRecord: false },
  { main: "בתהליך", secondary: "סטטוס ישן שלא קיים", full: null, partial: null, source: "meta_standard_form" },
  { main: "לא מעוניין", secondary: 'ל"מ - אין יכולת כלכלית', full: null, partial: null, source: "meta_rich_form" },
  { main: "נרשם", secondary: "תשלום מלא", full: 2000, partial: null, source: "meta_standard_form" },
];

const EXPECTED = { leads: 12, sales: 4, revenue: 3500, green: 6, red: 3, pending: 2, unmapped: 1, irrelevant: 2 };

function adFor(index) {
  return index === 9 ? UNKNOWN_AD : ADS[index % ADS.length];
}
function metaLead(index, fixture) {
  return {
    id: `lead-${index + 1}`,
    createdTime: `${DAY}T08:00:00.000Z`,
    name: `ליד בדיקה ${index + 1}`,
    phone: null,
    normalizedPhone: null,
    email: null,
    formId: "form-test",
    ...adFor(index),
    sourceType: fixture.source,
  };
}
function statusRecord(index, fixture) {
  return {
    leadId: `lead-${index + 1}`,
    normalizedPhone: null,
    mainStatus: fixture.main,
    secondaryStatus: fixture.secondary,
    fullPaymentAmount: fixture.full,
    partialPaymentAmount: fixture.partial,
    studentRating: null,
    updatedAt: `${DAY}T08:00:00.000Z`,
  };
}
function leadFact(index, fixture) {
  return {
    id: `lead-${index + 1}`,
    sourceType: fixture.source,
    leadDate: DAY,
    campaignId: adFor(index).campaignId,
    adSetId: adFor(index).adSetId,
    adId: adFor(index).adId,
    statusKnown: true,
    mainStatus: fixture.main,
    secondaryStatus: fixture.secondary,
    fullPaymentAmount: fixture.full,
    partialPaymentAmount: fixture.partial,
  };
}

const json = (route, body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

async function installLeadRoutes(context) {
  await context.route((url) => url.pathname === "/api/leads", (route) =>
    json(route, { source: "meta", leads: FIXTURE.map((f, i) => metaLead(i, f)) })
  );
  await context.route((url) => url.pathname === "/api/landing-leads", (route) => json(route, { leads: [] }));
  await context.route((url) => url.pathname === "/api/lead-status/batch", (route) =>
    json(route, { records: FIXTURE.flatMap((f, i) => (f.hasRecord === false ? [] : [statusRecord(i, f)])) })
  );
  await context.route((url) => url.pathname === "/api/lead-status/health", (route) => json(route, { connected: true }));
  await context.route((url) => url.pathname === "/api/lead-status/missing-payment", (route) =>
    json(route, { leads: [], metaAvailable: true })
  );
}

async function installDashboardRoutes(context) {
  await context.route((url) => url.pathname === "/api/lead-facts", (route) =>
    json(route, {
      since: DAY,
      until: DAY,
      leads: FIXTURE.map((f, i) => leadFact(i, f)),
      sources: {
        meta: { state: "ok", message: null },
        landing: { state: "ok", message: null },
        statuses: { state: "ok", unknownCount: 0, message: null },
      },
    })
  );
}

const numberFrom = (text) => {
  if (text === undefined) return null;
  const cleaned = text.replace(/[^\d.-]/g, "");
  return cleaned === "" ? null : Number(cleaned);
};

async function kpiValues(page) {
  return page.evaluate(() => {
    const out = {};
    for (const content of document.querySelectorAll('[data-slot="card-content"]')) {
      const label = content.querySelector(".text-xs > span")?.textContent;
      const value = content.querySelector(".text-2xl")?.textContent;
      if (label && value !== undefined) out[label] = value;
    }
    return out;
  });
}

async function fetchDemoSpend() {
  const res = await fetch(`${BASE}/api/advertising?since=${DAY}&until=${DAY}`);
  const body = await res.json();
  let total = 0;
  for (const campaign of body.campaigns) for (const adSet of campaign.adSets) for (const ad of adSet.ads) total += ad.metrics.spend;
  return total;
}


// --- Access. The app has no sign-in: the suites call the server directly. See tests/README.md for the servers.

/** fetch() for the app's own APIs. There is no sign-in, so this is a plain fetch. */
async function authedFetch(url, init = {}) {
  return fetch(url, init);
}

/** A browser context for the suites. There is no sign-in, so the context starts empty. */
async function newAuthedContext(browser, options = {}) {
  return browser.newContext(options);
}

module.exports = { installLeadRoutes, installDashboardRoutes, json, numberFrom, kpiValues, fetchDemoSpend, BASE, DESKTOP, DAY, EXPECTED, authedFetch, newAuthedContext };
