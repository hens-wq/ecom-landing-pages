// Pure-logic checks for the shared performance layer (scratch test, not part of the repo).
// Run: npx tsx --tsconfig /home/user/ecom-landing-pages/tsconfig.json <this file>
import { isDeepStrictEqual } from "node:util";

import { aggregateFlags, aggregateTotals, buildPerformanceTree } from "@/lib/aggregate";
import { activePaymentAmount } from "@/lib/lead-status/calculations";
import { SECONDARY_STATUSES_BY_MAIN, defaultLeadStatusRecord, type LeadStatusRecord } from "@/lib/lead-status/types";
import { attributeLeadFacts } from "@/lib/performance/attribution";
import { activeAmount, computeLeadKpis } from "@/lib/performance/lead-metrics";
import {
  classifyLeadQuality,
  GREEN_LEAD_LABELS,
  normalizeStatusLabel,
  PENDING_LEAD_LABELS,
  RED_LEAD_LABELS,
} from "@/lib/performance/lead-quality";
import { cplTier } from "@/lib/performance/cpl-tier";
import { cellDisplay, columnByKey } from "@/lib/performance/display";
import { expandableRowIds } from "@/lib/performance/expansion";
import { loadLeadFacts, LeadSourceError, type LeadFactsSources } from "@/lib/performance/load-lead-facts";
import { sortCampaignRows } from "@/lib/performance/sort";
import type { LeadFact } from "@/lib/performance/types";
import type { LandingLeadRecord } from "@/lib/landing-leads/types";
import type { MetaFormLead } from "@/lib/leads/types";
import type { Campaign } from "@/lib/types";

let passed = 0;
let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (isDeepStrictEqual(actual, expected)) {
    passed += 1;
  } else {
    failed += 1;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

function fact(overrides: Partial<LeadFact> & { id: string }): LeadFact {
  return {
    sourceType: "unknown",
    leadDate: "2026-10-08",
    campaignId: null,
    adSetId: null,
    adId: null,
    statusKnown: true,
    mainStatus: "חדש",
    secondaryStatus: "חדש",
    fullPaymentAmount: null,
    partialPaymentAmount: null,
    ...overrides,
  };
}

// ---------- status classification
for (const label of GREEN_LEAD_LABELS) check(`green: ${label}`, classifyLeadQuality(label), "green");
for (const label of PENDING_LEAD_LABELS) check(`pending: ${label}`, classifyLeadQuality(label), "pending");
for (const label of RED_LEAD_LABELS) check(`red: ${label}`, classifyLeadQuality(label), "red");

for (const label of Object.values(SECONDARY_STATUSES_BY_MAIN).flat()) {
  check(`every existing secondary is classified: ${label}`, classifyLeadQuality(label) === "unmapped", false);
}
const allLabelKeys = [...GREEN_LEAD_LABELS, ...PENDING_LEAD_LABELS, ...RED_LEAD_LABELS].map(normalizeStatusLabel);
check("no label is listed twice across the three lists", new Set(allLabelKeys).size, allLabelKeys.length);
check("backslash variant of the course-structure status is green", classifyLeadQuality('ל"מ - לו"ז \\ מבנה הקורס'), "green");
check("gershayim variant is normalised", classifyLeadQuality("ל״מ - מחיר יקר"), "green");
check("extra spaces are normalised", classifyLeadQuality("ליד שגוי  -  לקוח קיים"), "red");
check("a different apostrophe is NOT silently matched", classifyLeadQuality("ל'מ - מחיר יקר"), "unmapped");
check("unknown label stays unmapped", classifyLeadQuality("סטטוס חדש לגמרי"), "unmapped");
check("empty secondary is pending", classifyLeadQuality(""), "pending");
check("null secondary is pending", classifyLeadQuality(null), "pending");

// ---------- CPL tiers
check("80 is on target", cplTier(80), "on_target");
check("79.99 is on target", cplTier(79.99), "on_target");
check("80.01 is follow-up", cplTier(80.01), "follow_up");
check("99.99 is follow-up", cplTier(99.99), "follow_up");
check("100 is a warning", cplTier(100), "warning");
check("149.99 is a warning", cplTier(149.99), "warning");
check("150 is severe", cplTier(150), "severe");
check("null has no tier", cplTier(null), null);
check("NaN has no tier", cplTier(Number.NaN), null);

// ---------- payment rule parity
for (const mainStatus of ["נרשם", "חדש"]) {
  for (const secondaryStatus of ["נרשם", "תשלום מלא", "תשלום חלקי", "חדש"]) {
    for (const full of [null, 0, 500]) {
      for (const partial of [null, 250]) {
        const record = { ...defaultLeadStatusRecord("x", null), mainStatus, secondaryStatus, fullPaymentAmount: full, partialPaymentAmount: partial } as LeadStatusRecord;
        check(
          `activePaymentAmount matches activeAmount ${mainStatus}/${secondaryStatus}/${full}/${partial}`,
          activePaymentAmount(record),
          activeAmount(mainStatus, secondaryStatus, full, partial)
        );
      }
    }
  }
}
check("enrolled without amount: sale with no revenue", activeAmount("נרשם", "נרשם", null, null), null);
check("full payment counts only the full amount", activeAmount("נרשם", "תשלום מלא", 900, 300), 900);
check("partial payment counts only the partial amount", activeAmount("נרשם", "תשלום חלקי", 900, 300), 300);

// ---------- KPI formulas
const kpiLeads: LeadFact[] = [
  fact({ id: "K1", mainStatus: "נרשם", secondaryStatus: "תשלום מלא", fullPaymentAmount: 500 }),
  fact({ id: "K2", mainStatus: "נרשם", secondaryStatus: "נרשם" }),
  fact({ id: "K3" }),
  fact({ id: "K4", statusKnown: false, mainStatus: null, secondaryStatus: null }),
];
const kpi = computeLeadKpis(kpiLeads, 1000, { spendMatchesLeads: true });
check("kpi leads include unknown-status leads", kpi.leads, 4);
check("kpi sales", kpi.sales, 2);
check("kpi revenue counts entered amounts only", kpi.revenue, 500);
check("kpi close rate = sales / leads x 100", kpi.closeRate, 50);
check("kpi cost per registration = spend / sales", kpi.costPerRegistration, 500);
check("kpi CPL = spend / leads", kpi.cpl, 250);
check("kpi qualified CPL = spend / green", kpi.qualifiedCpl, 500);
check("kpi quality counts", kpi.quality, { green: 2, pending: 1, red: 0, unmapped: 0 });
check("kpi unknown status count", kpi.unknownStatusLeads, 1);
const kpiNoMatch = computeLeadKpis(kpiLeads, 1000, { spendMatchesLeads: false });
check("spend that does not match the leads gives no cost figures", [kpiNoMatch.cpl, kpiNoMatch.qualifiedCpl, kpiNoMatch.costPerRegistration], [null, null, null]);
check("close rate does not depend on spend", kpiNoMatch.closeRate, 50);
const kpiNoSpend = computeLeadKpis(kpiLeads, null, { spendMatchesLeads: true });
check("no spend gives no cost figures", [kpiNoSpend.cpl, kpiNoSpend.costPerRegistration], [null, null]);
const kpiEmpty = computeLeadKpis([], 100, { spendMatchesLeads: true });
check("zero leads: no close rate, CPL or qualified CPL", [kpiEmpty.closeRate, kpiEmpty.cpl, kpiEmpty.qualifiedCpl], [null, null, null]);
const kpiNoSales = computeLeadKpis([fact({ id: "N1" })], 100, { spendMatchesLeads: true });
check("no sales: cost per registration is null, not zero", kpiNoSales.costPerRegistration, null);

// ---------- hierarchy, attribution and totals
const campaigns: Campaign[] = [
  {
    id: "C1",
    name: "קמפיין 1",
    objective: "Leads",
    status: "active",
    adSets: [
      {
        id: "S1",
        name: "סט 1",
        campaignId: "C1",
        status: "active",
        ads: [
          { id: "A1", name: "מודעה 1", adSetId: "S1", status: "active", destinationType: "unknown", metrics: { spend: 100, impressions: 1000, reach: 800, linkClicks: 10, leads: 0, sales: 0, revenue: 0 } },
          { id: "A2", name: "מודעה 2", adSetId: "S1", status: "paused", destinationType: "unknown", metrics: { spend: 50, impressions: 500, reach: 400, linkClicks: 5, leads: 0, sales: 0, revenue: 0 } },
        ],
      },
      {
        id: "S2",
        name: "סט 2",
        campaignId: "C1",
        status: "paused",
        ads: [
          { id: "A3", name: "מודעה 3", adSetId: "S2", status: "paused", destinationType: "unknown", metrics: { spend: 0, impressions: 0, reach: 0, linkClicks: 0, leads: 0, sales: 0, revenue: 0 } },
        ],
      },
    ],
  },
  {
    id: "C2",
    name: "קמפיין 2",
    objective: "Leads",
    status: "ended",
    adSets: [
      {
        id: "S3",
        name: "סט 3",
        campaignId: "C2",
        status: "ended",
        ads: [
          { id: "A4", name: "מודעה 4", adSetId: "S3", status: "ended", destinationType: "unknown", metrics: { spend: 25, impressions: 250, reach: 200, linkClicks: 2, leads: 0, sales: 0, revenue: 0 } },
        ],
      },
    ],
  },
];

const facts: LeadFact[] = [
  fact({ id: "L1", adId: "A1", adSetId: "S1", campaignId: "C1", mainStatus: "נרשם", secondaryStatus: "תשלום מלא", fullPaymentAmount: 300 }),
  fact({ id: "L2", adSetId: "S1", campaignId: "C1" }),
  fact({ id: "L3", campaignId: "C2", mainStatus: "בתהליך", secondaryStatus: "בתהליך" }),
  fact({ id: "L4", campaignId: "CX" }),
  fact({ id: "L5", adId: "A3", adSetId: "S2", campaignId: "C1", statusKnown: false, mainStatus: null, secondaryStatus: null }),
  fact({ id: "L6", adId: "A2", adSetId: "S1", campaignId: "C1", mainStatus: "לא מעוניין", secondaryStatus: 'ל"מ - אין יכולת כלכלית' }),
];
const attribution = attributeLeadFacts(campaigns, facts);
const tree = buildPerformanceTree(campaigns, attribution);
const [c1, c2, unassigned] = tree;

check("tree has two campaigns plus the unassigned row", tree.map((row) => row.id), ["C1", "C2", "unassigned-campaign"]);
check("campaign C1 leads: two ads, one direct ad-set lead, one unknown-status ad lead", c1.metrics.leads, 4);
check("campaign C1 spend is the sum of its ads", c1.metrics.spend, 150);
check("campaign C1 counts its unknown-status lead", c1.unknownStatusLeads, 1);
check("ad A1 sale and revenue", [c1.adSets[0].ads[0].metrics.sales, c1.adSets[0].ads[0].metrics.revenue], [1, 300]);
check("ad A1 keeps its Meta spend", c1.adSets[0].ads[0].metrics.spend, 100);
check("ad set S1 holds a synthetic row for its direct lead", c1.adSets[0].ads.map((ad) => ad.id), ["A1", "A2", "unassigned-ad:S1"]);
check("campaign C2 holds a synthetic ad set for its direct lead", c2.adSets.map((adSet) => adSet.id), ["S3", "unassigned-adset:C2"]);
check("unassigned row carries only its lead", [unassigned.isUnassigned, unassigned.metrics.leads, unassigned.metrics.spend], [true, 1, 0]);
const totals = aggregateTotals(tree, null);
check("totals count every lead exactly once", totals.leads, facts.length);
check("totals sales", totals.sales, 1);
check("totals revenue", totals.revenue, 300);
check("totals spend is Meta spend only", totals.spend, 175);
check("totals lead flags", aggregateFlags(tree), { leadsKnown: true, unknownStatusLeads: 1 });

check("expandable rows exclude empty synthetic rows", expandableRowIds(tree), ["C1", "S1", "S2", "C2", "S3"]);

const withoutLeads = buildPerformanceTree(campaigns);
check("without lead data no synthetic rows are added", withoutLeads.map((row) => row.id), ["C1", "C2"]);
check("without lead data leads are unknown, not zero", cellDisplay(withoutLeads[0], columnByKey("leads")!).text, "—");
check("without lead data spend still shows", cellDisplay(withoutLeads[0], columnByKey("spend")!).text.includes("150"), true);

const unassignedCpl = cellDisplay(unassigned, columnByKey("cpl")!);
check("unassigned CPL is not applicable", unassignedCpl.state, "not_applicable");
check("unassigned leads are shown", cellDisplay(unassigned, columnByKey("leads")!).text, "1");
check("unknown-only row sales are unknown", cellDisplay(c1.adSets[1].ads[0], columnByKey("sales")!).state, "unknown");
const campaignSales = cellDisplay(c1, columnByKey("sales")!);
check("partially known sales are a value flagged partial", [campaignSales.state, campaignSales.text, campaignSales.partial], ["value", "1", true]);

// ---------- sorting keeps the hierarchy and sinks gaps
const bySpendDesc = sortCampaignRows(tree, { key: "spend", direction: "desc" });
check("sort by spend desc orders campaigns, unassigned last", bySpendDesc.map((row) => row.id), ["C1", "C2", "unassigned-campaign"]);
check("sort by spend orders ad sets inside their campaign", bySpendDesc[0].adSets.map((adSet) => adSet.id), ["S1", "S2"]);
check("sort by spend orders ads, synthetic last", bySpendDesc[0].adSets[0].ads.map((ad) => ad.id), ["A1", "A2", "unassigned-ad:S1"]);
const byCplAsc = sortCampaignRows(tree, { key: "cpl", direction: "asc" });
check("missing CPL sinks even when sorting ascending", byCplAsc.map((row) => row.id), ["C2", "C1", "unassigned-campaign"]);
const byCplDesc = sortCampaignRows(tree, { key: "cpl", direction: "desc" });
check("missing CPL sinks when sorting descending", byCplDesc.map((row) => row.id), ["C1", "C2", "unassigned-campaign"]);
const byName = sortCampaignRows(tree, { key: "name", direction: "desc" });
check("name sort is Hebrew-aware and descending", byName.map((row) => row.id), ["C2", "C1", "unassigned-campaign"]);
check("no sort keeps input order", sortCampaignRows(tree, null).map((row) => row.id), ["C1", "C2", "unassigned-campaign"]);

// ---------- lead facts loader (fake sources)
const meta = (id: string, createdTime: string): MetaFormLead => ({
  id,
  createdTime,
  name: "TEST_NAME_SHOULD_NOT_LEAK",
  phone: "TEST_PHONE_SHOULD_NOT_LEAK",
  normalizedPhone: "0500000000",
  email: null,
  formId: "F",
  campaignId: "C1",
  campaignName: "קמפיין 1",
  adSetId: "S1",
  adSetName: "סט 1",
  adId: "A1",
  adName: "מודעה 1",
  sourceType: "unknown",
});
const landing = (id: string): LandingLeadRecord =>
  ({
    internalLeadId: id,
    leadSource: "landing_page",
    metaLeadId: null,
    createdAt: "2026-10-08T06:00:00Z",
    submittedAt: "2026-10-08T06:00:00Z",
    name: "TEST_NAME_SHOULD_NOT_LEAK",
    phone: "TEST_PHONE_SHOULD_NOT_LEAK",
    normalizedPhone: "0500000001",
    email: null,
    campaignId: "C2",
    adSetId: "S3",
    adId: null,
    landingPageUrl: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    fbclid: null,
    placement: null,
    siteSource: null,
  }) as LandingLeadRecord;

const range = { since: "2026-10-08", until: "2026-10-08" };
const registered: LeadStatusRecord = { ...defaultLeadStatusRecord("M1", null), mainStatus: "נרשם", secondaryStatus: "תשלום מלא", fullPaymentAmount: 700 };

const okSources: LeadFactsSources = {
  readMetaLeads: async () => [meta("M1", "2026-10-07T21:30:00Z"), meta("M2", "2026-10-08T09:00:00Z")],
  readLandingLeads: async () => [landing("U1")],
  readStatuses: async (ids) => new Map(ids.filter((id) => id === "M1").map((id) => [id, registered])),
};
const okResult = await loadLeadFacts(range, okSources);
check("loader merges meta and landing leads", okResult.leads.length, 3);
check("loader sets Israel reporting date", okResult.leads.find((lead) => lead.id === "M1")?.leadDate, "2026-10-08");
check("loader reads a saved status", okResult.leads.find((lead) => lead.id === "M1")?.fullPaymentAmount, 700);
check("loader gives leads without a saved status the default", okResult.leads.find((lead) => lead.id === "M2")?.secondaryStatus, "חדש");
check("loader reports all sources ok", [okResult.sources.meta.state, okResult.sources.landing.state, okResult.sources.statuses.state], ["ok", "ok", "ok"]);
check("loader output carries no personal data", JSON.stringify(okResult).includes("TEST_"), false);

const metaDown = await loadLeadFacts(range, {
  ...okSources,
  readMetaLeads: async () => {
    throw new LeadSourceError("Meta מושבת כרגע.");
  },
});
check("meta outage is reported with its safe message", [metaDown.sources.meta.state, metaDown.sources.meta.message], ["unavailable", "Meta מושבת כרגע."]);
check("meta outage keeps landing leads only", metaDown.leads.map((lead) => lead.id), ["U1"]);

const genericFailure = await loadLeadFacts(range, {
  ...okSources,
  readMetaLeads: async () => {
    throw new Error("secret-token-value");
  },
});
check("unexpected errors never leak their text", JSON.stringify(genericFailure.sources.meta).includes("secret"), false);
check("unexpected errors get a generic message", genericFailure.sources.meta.message, "לא ניתן לטעון לידים מ-Meta כרגע.");

const manyMeta = Array.from({ length: 600 }, (_, index) => meta(`B${index}`, "2026-10-08T09:00:00Z"));
const partialStatuses = await loadLeadFacts(range, {
  readMetaLeads: async () => manyMeta,
  readLandingLeads: async () => [],
  readStatuses: async (ids) => {
    if (ids.length < 500) throw new LeadSourceError("חלק מהסטטוסים לא נטען.");
    return new Map();
  },
});
check("second status batch failing makes statuses partial", [partialStatuses.sources.statuses.state, partialStatuses.sources.statuses.unknownCount], ["partial", 100]);
check("only the failed batch's leads are unknown", partialStatuses.leads.filter((lead) => !lead.statusKnown).length, 100);

const allStatusesDown = await loadLeadFacts(range, {
  ...okSources,
  readStatuses: async () => {
    throw new LeadSourceError("מסד הנתונים לא זמין.");
  },
});
check("all statuses failing is unavailable with every lead unknown", [allStatusesDown.sources.statuses.state, allStatusesDown.sources.statuses.unknownCount], ["unavailable", 3]);
check("unknown statuses never become sales", computeLeadKpis(allStatusesDown.leads, 500, { spendMatchesLeads: true }).sales, 0);
check("unknown statuses are counted as unknown", aggregateFlags(buildPerformanceTree(campaigns, attributeLeadFacts(campaigns, allStatusesDown.leads))).unknownStatusLeads, 3);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
