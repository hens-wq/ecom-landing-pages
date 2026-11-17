"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, Megaphone } from "lucide-react";

import { AdClosureBand, AdClosuresSourceTable, type AdClosureContext } from "@/components/lead-quality/ad-closures";
import { CampaignScaleBadge, CampaignScaleRecommendation } from "@/components/lead-quality/scale-recommendation";
import { StudentRatingSummary } from "@/components/lead-quality/student-rating-summary";
import type { DateRange } from "@/lib/advertising/types";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { AdClosureSummary } from "@/lib/lead-quality/ad-closures";
import { formatCplCurrency, getCplColor } from "@/lib/lead-quality/presentation";
import { studentRatingCooperation } from "@/lib/lead-quality/student-rating";
import type { CampaignScaleAssessment } from "@/lib/lead-quality/scale";
import type {
  LeadQualityAd,
  LeadQualityAdSet,
  LeadQualityCampaign,
  LeadQualityColor,
  LeadQualityCount,
  LeadQualityRow,
  LeadQualityStatusGroup,
} from "@/lib/lead-quality/types";
import { cn } from "@/lib/utils";

const COLOR_CLASSES: Record<LeadQualityColor, { row: string; dot: string; text: string; label: string }> = {
  green: { row: "border-emerald-200 bg-emerald-50/70", dot: "bg-emerald-500", text: "text-emerald-800", label: "רלוונטי" },
  orange: { row: "border-amber-200 bg-amber-50/70", dot: "bg-amber-500", text: "text-amber-900", label: "ממתין להכרעה" },
  red: { row: "border-rose-200 bg-rose-50/70", dot: "bg-rose-500", text: "text-rose-800", label: "לא רלוונטי" },
  neutral: { row: "border-slate-200 bg-slate-50", dot: "bg-slate-400", text: "text-foreground", label: "ללא סיווג איכות" },
};

const CLOSED_OVERVIEW_COLORS = {
  background: "#374151",
  text: "#ffffff",
  cpl: { green: "#6ee7b7", orange: "#fcd34d", red: "#fda4af", neutral: "#ffffff" },
} satisfies { background: string; text: string; cpl: Record<LeadQualityColor, string> };

interface AdClosureLookup {
  closureById?: ReadonlyMap<string, AdClosureSummary>;
  closureRange?: DateRange;
  closuresLoading?: boolean;
  closuresError?: boolean;
}

function orderAdSetsForDisplay(adSets: readonly LeadQualityAdSet[]): LeadQualityAdSet[] {
  const active: LeadQualityAdSet[] = [];
  const unknown: LeadQualityAdSet[] = [];
  const closed: LeadQualityAdSet[] = [];
  for (const adSet of adSets) {
    if (adSet.status === "active") active.push(adSet);
    else if (adSet.status === "paused" || adSet.status === "ended") closed.push(adSet);
    else unknown.push(adSet);
  }
  return [...active, ...unknown, ...closed];
}

export function formatAdName(name: string): string {
  const trimmed = name.replace(/^[\s\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]+|[\s\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]+$/gu, "");
  if (!trimmed) return "מודעה ללא שם";
  return /^מודעה(?:$|[\s\d:.,;!?"'/_־–—()\u200E\u200F-])/u.test(trimmed) ? trimmed : `מודעה ${trimmed}`;
}

/** Map insertion order retains the source's ad-set order and each set's ad order. */
export function groupAdsByAdSet(ads: readonly LeadQualityAd[]) {
  const groups = new Map<string, { id: string; name: string | null; ads: LeadQualityAd[] }>();
  for (const ad of ads) {
    const name = ad.adSetName?.trim();
    const id = ad.adSetId ? `id:${ad.adSetId}` : name ? `name:${name}` : "unassigned";
    const existing = groups.get(id);
    if (existing) {
      existing.ads.push(ad);
      if (!existing.name && name) existing.name = name;
    } else {
      groups.set(id, { id, name: name || null, ads: [ad] });
    }
  }
  return Array.from(groups.values(), (group) => ({ ...group, name: group.name || "לא ידועה" }));
}

/** The parent's real status controls visibility; child status never guesses a series status. */
export function visibleAdsForAdSet(adSet: Pick<LeadQualityAdSet, "status">, ads: readonly LeadQualityAd[]): readonly LeadQualityAd[] {
  return adSet.status === "active" ? ads.filter((ad) => ad.status === "active") : ads;
}

export function percentText(value: number | null): string {
  return value === null ? "—" : `${value.toLocaleString("he-IL", { maximumFractionDigits: 1 })}%`;
}

/** Unknown sources are never rendered as a confirmed zero. */
export function leadCountText(count: number, complete: boolean): string {
  if (complete) return formatNumber(count);
  return count > 0 ? `לפחות ${formatNumber(count)}` : "לא זמין";
}

function CountAndPercent({ value, incomplete = false }: { value: LeadQualityCount; incomplete?: boolean }) {
  const displayedPercent = incomplete && value.count === 0 ? null : value.percent;
  return (
    <span className="shrink-0 whitespace-nowrap text-sm font-bold tabular-nums" aria-label={`${leadCountText(value.count, !incomplete)}, ${percentText(displayedPercent)} מכלל הלידים`}>
      {incomplete && value.count > 0 ? <span className="me-1 text-[11px] font-normal">לפחות</span> : null}
      <bdi dir="ltr">{incomplete && value.count === 0 ? "—" : formatNumber(value.count)} ({percentText(displayedPercent)})</bdi>
    </span>
  );
}

function EntityStatus({ status, parentClosed = false }: { status: LeadQualityRow["status"]; parentClosed?: boolean }) {
  const active = status === "active" && !parentClosed;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium", active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-foreground")}>
      <span className={cn("size-1.5 rounded-full", active ? "bg-emerald-500" : "bg-slate-400")} aria-hidden="true" />
      {parentClosed ? "הסדרה סגורה" : active ? "פעיל" : status === "ended" ? "הסתיים" : status === "paused" ? "כבוי" : "השיוך לא ידוע"}
    </span>
  );
}

function Metrics({ row, dark = false }: { row: LeadQualityRow; dark?: boolean }) {
  const cplColor = getCplColor(row.cpl);
  const rating = row.summary.studentRating;
  const cooperation = studentRatingCooperation(rating, row.totalLeads, row.leadsKnown);
  const incomplete = !row.leadsKnown || !rating?.complete;
  const cooperationLabel = cooperation.percent === null || (incomplete && cooperation.count === 0) ? "לא זמין" : `${incomplete ? "לפחות " : ""}${percentText(cooperation.percent)}`;
  return (
    <dl className={cn("mx-auto grid w-full max-w-2xl grid-cols-2 gap-3 text-center sm:grid-cols-4 sm:gap-6", !dark && "text-foreground")} style={dark ? { color: CLOSED_OVERVIEW_COLORS.text } : undefined}>
      <div className="min-w-0">
        <dt className="text-[11px]">סכום שהוצא</dt>
        <dd className="mt-1 whitespace-nowrap text-base font-bold tabular-nums"><bdi>{formatCurrency(row.spend)}</bdi></dd>
      </div>
      <div className="min-w-0">
        <dt className="text-[11px]">סך הלידים</dt>
        <dd className="mt-1 text-base font-bold tabular-nums">{leadCountText(row.totalLeads, row.leadsKnown)}</dd>
      </div>
      <div className="min-w-0">
        <dt className="text-[11px]">עלות לליד</dt>
        <dd className={cn("mt-1 whitespace-nowrap text-base font-bold tabular-nums", !dark && COLOR_CLASSES[cplColor].text)} style={dark ? { color: CLOSED_OVERVIEW_COLORS.cpl[cplColor] } : undefined}><bdi>{formatCplCurrency(row.cpl)}</bdi></dd>
      </div>
      <div className="min-w-0">
        <dt className="text-[11px]">אחוז שיתוף פעולה</dt>
        <dd className="mt-1 whitespace-nowrap text-base font-bold tabular-nums"><bdi>{cooperationLabel}</bdi></dd>
        <span className="sr-only">דירוג 3, 4 או 5 להבות מתוך כלל הלידים בטווח הנבחר</span>
      </div>
    </dl>
  );
}

export function QualityLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-foreground" aria-label="מקרא צבעי הסטטוסים">
      {(["green", "red", "orange", "neutral"] as const).map((color) => (
        <span key={color} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", COLOR_CLASSES[color].dot)} aria-hidden="true" />
          {COLOR_CLASSES[color].label}
        </span>
      ))}
    </div>
  );
}

function StatusTable({ row, groups, showZero }: { row: LeadQualityRow; groups: LeadQualityStatusGroup[]; showZero: boolean }) {
  const incomplete = !row.leadsKnown || row.unknownStatusLeads > 0;
  const displayName = row.level === "ad" ? formatAdName(row.name) : row.name;
  const columns = groups.map((group) => ({
    group,
    statuses: group.statuses.filter((status) => showZero || (row.statusCounts[status.id]?.count ?? 0) > 0),
  })).filter(({ statuses }) => statuses.length > 0);
  const divider = (groupIndex: number, isLast: boolean) => isLast && groupIndex < columns.length - 1 ? "border-e-[6px] border-e-slate-300" : "";

  if (columns.length === 0) {
    return <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-foreground">{incomplete ? "אין נתוני סטטוס זמינים בטווח שנבחר" : "אין לידים להצגת סטטוסים בטווח שנבחר"}</p>;
  }

  return (
    <div role="region" tabIndex={0} aria-label={`טבלת סטטוסים משניים של ${displayName}, ניתנת לגלילה אופקית`} className="mx-auto w-fit max-w-full overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      <table dir="rtl" className="w-max border-collapse text-center text-xs">
        <caption className="sr-only">סטטוסים משניים של {displayName}. כל תא מציג כמות ואחוז מכלל הלידים {row.level === "ad" ? "במודעה" : "בקמפיין"}.</caption>
        {columns.map(({ group, statuses }) => <colgroup key={group.id} span={statuses.length} />)}
        <thead>
          <tr className="bg-slate-100">
            {columns.map(({ group, statuses }, groupIndex) => <th key={group.id} scope="colgroup" colSpan={statuses.length} className={cn("border border-slate-200 px-3 py-2 text-center text-xs font-bold text-foreground", divider(groupIndex, true))}>{group.label}</th>)}
          </tr>
          <tr>
            {columns.flatMap(({ statuses }, groupIndex) => statuses.map((status, statusIndex) => (
              <th key={status.id} scope="col" className={cn("min-w-[128px] max-w-[180px] border border-slate-200 px-2 py-2 text-center align-middle text-[11px] font-medium leading-5", COLOR_CLASSES[status.color].row, COLOR_CLASSES[status.color].text, divider(groupIndex, statusIndex === statuses.length - 1))}>
                {status.label}<span className="sr-only">, {COLOR_CLASSES[status.color].label}</span>
              </th>
            )))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {columns.flatMap(({ statuses }, groupIndex) => statuses.map((status, statusIndex) => {
              const value = row.statusCounts[status.id] ?? { count: 0, percent: null };
              return <td key={status.id} className={cn("border border-slate-200 px-2 py-2.5 text-center", COLOR_CLASSES[status.color].row, COLOR_CLASSES[status.color].text, divider(groupIndex, statusIndex === statuses.length - 1))}><CountAndPercent value={value} incomplete={incomplete} /></td>;
            }))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function QualitySummary({ row, compact = false }: { row: LeadQualityRow; compact?: boolean }) {
  const { summary } = row;
  const incomplete = !row.leadsKnown || row.unknownStatusLeads > 0;
  const items: { label: string; value: LeadQualityCount; color: LeadQualityColor }[] = [
    { label: "לידים רלוונטיים", value: summary.relevant, color: "green" },
    { label: "לידים לא רלוונטיים", value: summary.irrelevant, color: "red" },
    { label: "ממתינים / טרם סווגו", value: summary.undetermined, color: "orange" },
    { label: "סגירות", value: summary.sales, color: "green" },
  ];

  return (
    <div className={cn("space-y-2 text-center", !compact && "rounded-lg bg-slate-50 p-3")}>
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className={cn("rounded-md border bg-white px-2 py-2 text-center", item.color === "green" ? "border-emerald-100" : item.color === "red" ? "border-rose-100" : "border-amber-100")}>
            <div className="mb-1 text-[11px] text-foreground">{item.label}</div>
            <div className={COLOR_CLASSES[item.color].text}><CountAndPercent value={item.value} incomplete={incomplete} /></div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-[11px] text-foreground">
        <span>עלות לליד רלוונטי: <bdi className="font-semibold text-foreground">{formatCurrency(summary.qualifiedCpl)}</bdi></span>
        <span>עלות לסגירה: <bdi className="font-semibold text-foreground">{formatCurrency(summary.costPerSale)}</bdi></span>
        {summary.sales.count > 0 ? <span>הכנסה שהוזנה: <bdi className="font-semibold text-foreground">{formatCurrency(summary.revenue)}</bdi></span> : null}
        {summary.unmapped.count > 0 ? <span>ללא מיפוי איכות: {formatNumber(summary.unmapped.count)}</span> : null}
        {summary.unknown.count > 0 ? <span>סטטוס לא זמין: {formatNumber(summary.unknown.count)}</span> : null}
      </div>
      <StudentRatingSummary summary={summary.studentRating} totalLeads={row.totalLeads} leadsKnown={row.leadsKnown} />
      <p className="sr-only">האחוזים מתוך כלל הלידים {row.level === "ad" ? "במודעה" : row.level === "total" ? "בקמפיינים המוצגים" : "בקמפיין"}. סגירות הן חלק מהלידים, ולא קבוצה נוספת בסיכום האיכות.</p>
    </div>
  );
}

function CommonReason({ row }: { row: LeadQualityRow }) {
  const top = row.summary.topReason;
  const tied = top ? row.summary.commonReasons.filter((reason) => reason.count === top.count) : [];
  const incomplete = !row.leadsKnown || row.unknownStatusLeads > 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-center">
      <p className="mb-1.5 text-[11px] font-semibold text-foreground">{tied.length > 1 ? "הסיבות הנפוצות ביותר, בתיקו" : "הסיבה הנפוצה ביותר"}</p>
      {top ? (
        <div className="space-y-1.5">
          {tied.map((reason) => (
            <div key={reason.statusId} className="flex flex-wrap items-center justify-center gap-3 text-xs">
              <span className="flex min-w-0 items-center justify-center gap-2 font-medium text-foreground">
                <span className={cn("size-2 shrink-0 rounded-full", COLOR_CLASSES[reason.color].dot)} aria-hidden="true" />
                {reason.label}
              </span>
              <CountAndPercent value={reason} incomplete={incomplete} />
            </div>
          ))}
          <p className="sr-only">לפי הסיבה שנרשמה בסטטוס המשני, מתוך כלל הלידים במודעה</p>
        </div>
      ) : (
        <p className="text-xs leading-5 text-foreground">{incomplete ? "אין מספיק נתוני סטטוס כדי לזהות סיבה נפוצה" : "לא נרשמו סיבות בטווח שנבחר"}</p>
      )}
    </div>
  );
}

function AdCard({ ad, groups, showZero, parentClosed = false, closure, closureRange, closuresLoading, closuresError }: { ad: LeadQualityAd; groups: LeadQualityStatusGroup[]; showZero: boolean; parentClosed?: boolean; closure?: AdClosureSummary; closureRange?: DateRange; closuresLoading?: boolean; closuresError?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const panelId = `lead-quality-ad-${encodeURIComponent(ad.campaignId)}-${encodeURIComponent(ad.id)}`;
  const displayName = ad.isUnassigned ? ad.name : formatAdName(ad.name);

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="space-y-3 p-3 text-center">
        <button type="button" onClick={() => setExpanded((previous) => !previous)} aria-expanded={expanded} aria-controls={panelId} aria-label={`${expanded ? "סגור" : "פתח"} את נתוני ${displayName}`} className="flex w-full min-w-0 flex-wrap items-center justify-center gap-2 rounded-md text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <span className="break-words text-sm font-bold text-foreground">{displayName}</span>
            <EntityStatus status={ad.status} parentClosed={parentClosed} />
            <ChevronDown className={cn("size-4 shrink-0 text-primary transition-transform motion-reduce:transition-none", expanded && "rotate-180")} aria-hidden="true" />
        </button>
        <Metrics row={ad} />
      </div>
      <AdClosureBand summary={closure} range={closureRange} loading={closuresLoading} error={closuresError} />
      <div id={panelId} hidden={!expanded}>
        {expanded ? (
          <div className="min-w-0 space-y-3 border-t border-slate-200 p-3">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
              {!ad.isUnassigned && !ad.isUnlisted ? (
                <a href={`/creative/${encodeURIComponent(ad.id)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-primary">
                  צפייה במודעה <ExternalLink className="size-3" aria-hidden="true" /><span className="sr-only">, נפתח בחלון חדש</span>
                </a>
              ) : <p className="text-[11px] text-amber-700">ההוצאה אינה משויכת בנפרד ללידים האלה</p>}
            </div>
            <StatusTable row={ad} groups={groups} showZero={showZero} />
            <QualitySummary row={ad} />
            <CommonReason row={ad} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function AdSetQualitySection({ adSet, ads: sourceAds, groups, showZero, closureById, closureRange, closuresLoading, closuresError }: { adSet: LeadQualityAdSet; ads: LeadQualityAd[]; groups: LeadQualityStatusGroup[]; showZero: boolean } & AdClosureLookup) {
  const [expanded, setExpanded] = useState(false);
  const panelId = `lead-quality-adset-${encodeURIComponent(adSet.campaignId)}-${encodeURIComponent(adSet.id)}`;
  const closed = adSet.status === "paused" || adSet.status === "ended";
  const ads = visibleAdsForAdSet(adSet, sourceAds);

  if (adSet.status === "active") {
    return (
      <section className="space-y-2" aria-label={`סדרת מודעות: ${adSet.name}`}>
        <h3 className="break-words px-2 py-2 text-center text-sm font-bold text-heading">סדרת מודעות: {adSet.name}</h3>
        <StudentRatingSummary summary={adSet.summary.studentRating} totalLeads={adSet.totalLeads} leadsKnown={adSet.leadsKnown} />
        {ads.length > 0 ? ads.map((ad) => <AdCard key={ad.id} ad={ad} groups={groups} showZero={showZero} closure={closureById?.get(ad.id)} closureRange={closureRange} closuresLoading={closuresLoading} closuresError={closuresError} />) : <p className="py-3 text-center text-xs text-foreground">אין מודעות פעילות</p>}
      </section>
    );
  }

  return (
    <section className={cn("min-w-0 overflow-hidden rounded-lg border", closed ? "border-slate-600" : "border-slate-300 bg-white")} style={closed ? { backgroundColor: CLOSED_OVERVIEW_COLORS.background, color: CLOSED_OVERVIEW_COLORS.text } : undefined} aria-label={`סדרת מודעות: ${adSet.name}`}>
      <div className="space-y-3 p-3 text-center">
        <button type="button" onClick={() => setExpanded((previous) => !previous)} aria-expanded={expanded} aria-controls={panelId} aria-label={`${expanded ? "סגור" : "פתח"} את מודעות הסדרה ${adSet.name}`} style={closed ? { color: CLOSED_OVERVIEW_COLORS.text } : undefined} className={cn("flex w-full min-w-0 flex-wrap items-center justify-center gap-2 rounded-md text-center focus-visible:outline-2 focus-visible:outline-offset-2", closed ? "focus-visible:outline-white" : "focus-visible:outline-primary")}>
          <span className={cn("break-words text-sm font-bold", !closed && "text-heading")}>סדרת מודעות: {adSet.name}</span>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", closed ? "border border-white/30 bg-white/15 text-white" : "bg-slate-100 text-foreground")}><span className={cn("size-1.5 rounded-full", closed ? "bg-white" : "bg-slate-400")} aria-hidden="true" />{closed ? "סגורה" : "סטטוס לא ידוע"}</span>
          <ChevronDown className={cn("size-4 shrink-0 transition-transform motion-reduce:transition-none", !closed && "text-primary", expanded && "rotate-180")} aria-hidden="true" />
        </button>
        <Metrics row={adSet} dark={closed} />
      </div>
      <div id={panelId} hidden={!expanded}>
        {expanded ? (
          <div className="space-y-3 border-t border-slate-200 bg-slate-50 p-2 sm:p-3">
            <StudentRatingSummary summary={adSet.summary.studentRating} totalLeads={adSet.totalLeads} leadsKnown={adSet.leadsKnown} />
            {ads.length > 0 ? ads.map((ad) => <AdCard key={ad.id} ad={ad} groups={groups} showZero={showZero} parentClosed={closed} closure={closureById?.get(ad.id)} closureRange={closureRange} closuresLoading={closuresLoading} closuresError={closuresError} />) : <p className="py-3 text-center text-xs text-foreground">אין מודעות בסדרה הזו</p>}
            {adSet.unassignedLeadCount > 0 ? <p className="text-center text-[11px] text-foreground">{formatNumber(adSet.unassignedLeadCount)} לידים ללא שיוך למודעה מוצגים בנפרד</p> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function CampaignAdList({ campaign, groups, showZero, adClosures, closureRange, closuresLoading, closuresError }: { campaign: LeadQualityCampaign; groups: LeadQualityStatusGroup[]; showZero: boolean } & AdClosureContext) {
  const unassignedAds = campaign.ads.filter((ad) => ad.isUnassigned);
  const adsById = new Map(campaign.ads.map((ad) => [ad.id, ad]));
  const closureById = new Map(adClosures?.map((summary) => [summary.adId, summary]) ?? []);
  return (
    <div className="space-y-3 rounded-lg bg-slate-100 p-2 sm:p-3">
      {orderAdSetsForDisplay(campaign.adSets).map((adSet) => <AdSetQualitySection key={adSet.id} adSet={adSet} ads={adSet.adIds.flatMap((id) => { const ad = adsById.get(id); return ad ? [ad] : []; })} groups={groups} showZero={showZero} closureById={closureById} closureRange={closureRange} closuresLoading={closuresLoading} closuresError={closuresError} />)}
      {unassignedAds.map((ad) => <AdCard key={ad.id} ad={ad} groups={groups} showZero={showZero} closure={closureById.get(ad.id)} closureRange={closureRange} closuresLoading={closuresLoading} closuresError={closuresError} />)}
      {campaign.adSets.length === 0 && unassignedAds.length === 0 ? <p className="py-5 text-center text-sm text-foreground">אין מודעות להצגה בקמפיין הזה</p> : null}
    </div>
  );
}

function CampaignDetails({ campaign, groups, showZero, ...closureContext }: { campaign: LeadQualityCampaign; groups: LeadQualityStatusGroup[]; showZero: boolean } & AdClosureContext) {
  const [showAds, setShowAds] = useState(false);
  const adsPanelId = `lead-quality-ads-${encodeURIComponent(campaign.id)}`;

  return (
    <div className="min-w-0 space-y-3 border-t border-slate-200 p-3 sm:p-4">
      {!campaign.isUnassigned && !campaign.isUnlisted ? <AdClosuresSourceTable {...closureContext} formatAdLabel={formatAdName} /> : null}
      <StatusTable row={campaign} groups={groups} showZero={showZero} />
      <QualitySummary row={campaign} />
      <div className="text-center">
        <button type="button" onClick={() => setShowAds((previous) => !previous)} aria-expanded={showAds} aria-controls={adsPanelId} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-primary hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          {showAds ? "הסתר מודעות" : "הצג מודעות"}
          <ChevronDown className={cn("size-3.5 transition-transform motion-reduce:transition-none", showAds && "rotate-180")} aria-hidden="true" />
        </button>
      </div>
      <div id={adsPanelId} hidden={!showAds}>
        {showAds ? <CampaignAdList campaign={campaign} groups={groups} showZero={showZero} {...closureContext} /> : null}
      </div>
    </div>
  );
}

export function CampaignQualityCard({ campaign, groups, expanded, onToggle, showZero, scale, scaleLoading = false, scaleError = false }: {
  campaign: LeadQualityCampaign;
  groups: LeadQualityStatusGroup[];
  expanded: boolean;
  onToggle: () => void;
  showZero: boolean;
  scale?: CampaignScaleAssessment;
  scaleLoading?: boolean;
  scaleError?: boolean;
}) {
  const panelId = `lead-quality-campaign-${encodeURIComponent(campaign.id)}`;
  const scaleApplicable = !campaign.isUnassigned && !campaign.isUnlisted;
  const closureContext: AdClosureContext = scaleApplicable ? { adClosures: scale?.adClosures, closureRange: scale?.range, closuresLoading: scaleLoading, closuresError: scaleError } : {};

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-3 px-3 py-4 text-center sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={panelId} aria-label={`${expanded ? "סגור" : "פתח"} את נתוני הקמפיין ${campaign.name}`} className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-2 rounded-md text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <Megaphone className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="break-words text-sm font-bold leading-6 text-heading sm:text-base">{campaign.name}</span>
            <EntityStatus status={campaign.status} />
            <ChevronDown className={cn("size-4 shrink-0 text-primary transition-transform motion-reduce:transition-none", expanded && "rotate-180")} aria-hidden="true" />
          </button>
          {scaleApplicable ? <CampaignScaleBadge assessment={scale} loading={scaleLoading} error={scaleError} expanded={expanded} panelId={panelId} onOpen={onToggle} /> : null}
        </div>
        <Metrics row={campaign} />
      </div>
      <div id={panelId} hidden={!expanded}>
        {expanded ? <>{scaleApplicable && (scaleLoading || scaleError || !scale || scale.status !== "none") ? <div className="px-3 pt-3 sm:px-4"><CampaignScaleRecommendation assessment={scale} loading={scaleLoading} error={scaleError} /></div> : null}<CampaignDetails campaign={campaign} groups={groups} showZero={showZero} {...closureContext} /></> : null}
      </div>
    </section>
  );
}
