"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, ChevronDown, Filter, Info, Loader2, RefreshCw, Search } from "lucide-react";

import { CampaignQualityCard, formatAdName, leadCountText, percentText, QualityLegend } from "@/components/lead-quality/quality-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currentMonthDateRange, isValidDateRange, presetDaysToDateRange, singleDayDateRange } from "@/lib/advertising/date-range";
import { isoDateInTimezone } from "@/lib/advertising/timezone";
import type { DateRange } from "@/lib/advertising/types";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { LeadQualityApiResponse, LeadQualityStatusFilter } from "@/lib/lead-quality/types";
import type { ScaleAnalysisResponse } from "@/lib/lead-quality/scale";
import { formatCplCurrency, getCplColor } from "@/lib/lead-quality/presentation";
import { cn } from "@/lib/utils";

const PRESETS = [
  { id: "today", label: "היום" },
  { id: "yesterday", label: "אתמול" },
  { id: "day_before_yesterday", label: "שלשום" },
  { id: "last_7", label: "שבוע אחרון" },
  { id: "current_month", label: "החודש" },
] as const;
type PresetId = (typeof PRESETS)[number]["id"] | "custom";

const FILTERS: { value: LeadQualityStatusFilter; label: string }[] = [
  { value: "active", label: "קמפיינים פעילים" },
  { value: "inactive", label: "קמפיינים כבויים" },
  { value: "all", label: "כל הקמפיינים" },
];

interface LoadState {
  key: string;
  body: LeadQualityApiResponse | null;
  error: string | null;
}

interface ScaleLoadState {
  key: string;
  body: ScaleAnalysisResponse | null;
  error: string | null;
}

function resolvePreset(preset: PresetId, customRange: DateRange): DateRange {
  if (preset === "custom") return customRange;
  if (preset === "today") return singleDayDateRange(0);
  if (preset === "yesterday") return singleDayDateRange(1);
  if (preset === "day_before_yesterday") return singleDayDateRange(2);
  if (preset === "current_month") return currentMonthDateRange();
  return presetDaysToDateRange(7);
}

function dateLabel(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

function updatedLabel(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit" }).format(date);
}

function errorMessage(data: unknown): string {
  if (typeof data === "object" && data !== null && "error" in data) {
    const error = (data as { error: unknown }).error;
    if (typeof error === "string") return error;
    if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") return error.message;
  }
  return "לא ניתן לטעון את נתוני הקמפיינים כרגע";
}

export function LeadQualityCenter() {
  const [preset, setPreset] = useState<PresetId>("last_7");
  const [customRange, setCustomRange] = useState<DateRange>(() => presetDaysToDateRange(7));
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange>(() => presetDaysToDateRange(7));
  const [status, setStatus] = useState<LeadQualityStatusFilter>("active");
  const [refresh, setRefresh] = useState(0);
  const [showZero, setShowZero] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [loaded, setLoaded] = useState<LoadState | null>(null);
  const [loadedScale, setLoadedScale] = useState<ScaleLoadState | null>(null);
  const range = resolvePreset(preset, customRange);
  const query = new URLSearchParams({ since: range.since, until: range.until, campaignStatus: status }).toString();
  const requestKey = `${query}&refresh=${refresh}`;
  const current = loaded?.key === requestKey ? loaded : null;
  const loading = current === null;
  const body = current?.body ?? null;
  const today = isoDateInTimezone(new Date());
  const scaleRequestKey = `${today}&refresh=${refresh}`;
  const currentScale = loadedScale?.key === scaleRequestKey ? loadedScale : null;
  const customValid = isValidDateRange(draftRange) && draftRange.until <= today;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/lead-quality?${query}`, { signal: controller.signal, cache: "no-store" });
        const data: unknown = await response.json();
        if (!response.ok) throw new Error(errorMessage(data));
        if (typeof data !== "object" || data === null || !("report" in data) || !("metadata" in data)) throw new Error("התקבלה תשובה לא תקינה מהשרת");
        if (active) setLoaded({ key: requestKey, body: data as LeadQualityApiResponse, error: null });
      } catch (error) {
        if (active && !controller.signal.aborted) setLoaded({ key: requestKey, body: null, error: error instanceof Error ? error.message : "לא ניתן לטעון את הנתונים" });
      }
    };
    void load();
    return () => { active = false; controller.abort(); };
  }, [query, requestKey]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/lead-quality/scale", { signal: controller.signal, cache: "no-store" });
        const data: unknown = await response.json();
        if (!response.ok) throw new Error(errorMessage(data));
        if (typeof data !== "object" || data === null || !("assessments" in data) || !Array.isArray(data.assessments) || !("metadata" in data)) throw new Error("התקבלה תשובת סקייל לא תקינה מהשרת");
        if (active) setLoadedScale({ key: scaleRequestKey, body: data as ScaleAnalysisResponse, error: null });
      } catch (error) {
        if (active && !controller.signal.aborted) setLoadedScale({ key: scaleRequestKey, body: null, error: error instanceof Error ? error.message : "לא ניתן לטעון את בדיקת הסקייל" });
      }
    };
    void load();
    return () => { active = false; controller.abort(); };
  }, [scaleRequestKey]);

  const scaleByCampaign = useMemo(() => new Map(currentScale?.body?.assessments.map((assessment) => [assessment.campaignId, assessment]) ?? []), [currentScale?.body]);

  const campaigns = useMemo(() => {
    const all = body?.report.campaigns ?? [];
    const term = search.trim().toLocaleLowerCase("he-IL");
    if (!term) return all;
    return all.filter((campaign) => campaign.name.toLocaleLowerCase("he-IL").includes(term) || campaign.adSets.some((adSet) => adSet.name.toLocaleLowerCase("he-IL").includes(term)) || campaign.ads.some((ad) => formatAdName(ad.name).toLocaleLowerCase("he-IL").includes(term)));
  }, [body, search]);

  function toggleCampaign(id: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleDates() {
    if (!datePickerOpen) setDraftRange(range);
    setDatePickerOpen(!datePickerOpen);
  }

  const notices = body ? [...new Set(body.metadata.notices.filter(Boolean))] : [];
  const total = body?.report.totals;
  const incomplete = total ? !total.leadsKnown || total.unknownStatusLeads > 0 : false;

  return (
    <div dir="rtl" className="mx-auto max-w-7xl space-y-4 pb-8">
      <header className="flex flex-col items-center gap-3 text-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">ניתוח איכות קמפיינים</h1>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
          {body ? <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5", body.metadata.source === "mock" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700")}><span className={cn("size-1.5 rounded-full", body.metadata.source === "mock" ? "bg-amber-500" : "bg-emerald-500")} aria-hidden="true" />{body.metadata.source === "mock" ? "נתוני הדגמה" : "נתוני פרסום מ־Meta"}</span> : null}
          {body ? <span className="text-foreground">נטען ב־<bdi>{updatedLabel(body.metadata.generatedAt)}</bdi></span> : null}
          <Button variant="outline" size="sm" onClick={() => setRefresh((value) => value + 1)} disabled={loading} className="bg-white"><RefreshCw className={cn("size-3.5", loading && "animate-spin")} aria-hidden="true" />רענון</Button>
        </div>
      </header>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="בחירת תקופה וקמפיינים">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <div className="flex flex-wrap justify-center gap-1.5" aria-label="תקופת הניתוח">
            {PRESETS.map((item) => <Button key={item.id} size="sm" variant={preset === item.id ? "default" : "ghost"} aria-pressed={preset === item.id} onClick={() => { setExpanded(new Set()); setPreset(item.id); setDatePickerOpen(false); }}>{item.label}</Button>)}
            <Button variant={preset === "custom" ? "default" : "outline"} size="sm" onClick={toggleDates} aria-expanded={datePickerOpen} aria-controls="lead-quality-date-picker"><CalendarDays className="size-3.5" aria-hidden="true" />בחירת תאריכים<ChevronDown className={cn("size-3", datePickerOpen && "rotate-180")} aria-hidden="true" /></Button>
          </div>
          <label className="flex items-center gap-2 text-xs text-foreground"><Filter className="size-3.5" aria-hidden="true" /><span className="sr-only">סטטוס קמפיינים</span><select value={status} onChange={(event) => { setExpanded(new Set()); setStatus(event.target.value as LeadQualityStatusFilter); }} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-center text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary">{FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        </div>
        {datePickerOpen ? (
          <div id="lead-quality-date-picker" className="flex flex-wrap items-end justify-center gap-3 rounded-lg bg-slate-50 p-3 text-center">
            <label className="space-y-1 text-xs text-foreground"><span>מתאריך</span><Input type="date" dir="ltr" className="w-40" value={draftRange.since} max={draftRange.until || today} onChange={(event) => setDraftRange((previous) => ({ ...previous, since: event.target.value }))} /></label>
            <label className="space-y-1 text-xs text-foreground"><span>עד תאריך</span><Input type="date" dir="ltr" className="w-40" value={draftRange.until} min={draftRange.since || undefined} max={today} onChange={(event) => setDraftRange((previous) => ({ ...previous, until: event.target.value }))} /></label>
            <Button size="sm" className="h-9" disabled={!customValid} onClick={() => { if (customValid) { setExpanded(new Set()); setCustomRange(draftRange); setPreset("custom"); setDatePickerOpen(false); } }}>החל טווח</Button>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-center text-[11px] text-foreground">
          <span className="font-medium text-foreground"><bdi>{dateLabel(range.since)} — {dateLabel(range.until)}</bdi></span>
          {range.until === today ? <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">כולל היום, יום חלקי</span> : null}
        </div>
      </section>

      {loading ? <div role="status" className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm text-foreground"><Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />טוען קמפיינים וסטטוסים...</div> : null}
      {current?.error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center"><AlertCircle className="mx-auto mb-3 size-6 text-rose-600" aria-hidden="true" /><p className="font-semibold text-rose-900">לא ניתן להציג את הניתוח</p><p className="mx-auto mt-2 max-w-xl text-sm text-rose-800">{current.error}</p><Button className="mt-4" variant="outline" size="sm" onClick={() => setRefresh((value) => value + 1)}>נסה שוב</Button></div> : null}

      {body && total ? (
        <>
          {body.metadata.source === "mock" ? <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div><p className="font-bold">מוצגים נתוני הדגמה בלבד</p><p className="mt-1 text-xs leading-5">אלה אינם ביצועי הקמפיינים שלך. נתוני לידים שלא התקבלו אינם מוצגים כאפס.</p></div></div> : null}
          {!total.leadsKnown ? <div role="status" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900"><AlertCircle className="mt-1 size-4 shrink-0" aria-hidden="true" /><p>נתוני הלידים חלקיים או לא זמינים. מוצגים רק הלידים שהתקבלו; האחוזים והעלות לליד אינם זמינים עד להשלמת המקורות.</p></div> : null}
          {total.leadsKnown && total.unknownStatusLeads > 0 ? <div role="status" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900"><AlertCircle className="mt-1 size-4 shrink-0" aria-hidden="true" /><p>ל־{formatNumber(total.unknownStatusLeads)} לידים לא התקבל סטטוס זמין. ספירות האיכות והסגירות הן חלקיות; הנתון החסר אינו נחשב לליד לא רלוונטי או לאפס סגירות.</p></div> : null}
          {notices.length > 0 ? <details className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-foreground"><summary className="cursor-pointer font-medium text-foreground">מידע על הנתונים ({notices.length})</summary><ul className="mt-2 space-y-1.5 ps-4 leading-5">{notices.map((notice) => <li key={notice} className="list-disc">{notice}</li>)}</ul></details> : null}

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="סיכום התקופה ומסנן הקמפיינים, לפני החיפוש">
            {[
              { label: "הוצאה בטווח ובמסנן", value: formatCurrency(total.spend), detail: `${formatNumber(body.report.campaigns.length)} קמפיינים`, green: false },
              { label: "לידים בטווח שנבחר", value: leadCountText(total.totalLeads, total.leadsKnown), detail: null, green: false },
              { label: "עלות לליד", value: formatCplCurrency(total.cpl), detail: null, green: false, cpl: true },
              { label: "לידים רלוונטיים", value: incomplete && total.summary.relevant.count === 0 ? "לא זמין" : percentText(total.summary.relevant.percent), detail: `לידים: ${leadCountText(total.summary.relevant.count, !incomplete)}`, green: true },
              { label: "סגירות מהלידים בטווח", value: leadCountText(total.summary.sales.count, !incomplete), detail: `עלות לסגירה: ${formatCurrency(total.summary.costPerSale)}`, green: false },
            ].map((metric) => <div key={metric.label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 text-center"><p className="text-[11px] text-foreground">{metric.label}</p><p className={cn("mt-2 text-xl font-bold tabular-nums", metric.cpl ? ({ green: "text-emerald-700", orange: "text-amber-700", red: "text-rose-700", neutral: "text-foreground" }[getCplColor(total.cpl)]) : metric.green ? "text-emerald-700" : "text-heading")}><bdi>{metric.value}</bdi></p>{metric.detail ? <p className="mt-1.5 text-[10px] text-foreground">{metric.detail}</p> : null}</div>)}
          </section>

          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <QualityLegend />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] text-foreground"><input type="checkbox" checked={showZero} onChange={(event) => setShowZero(event.target.checked)} className="size-3.5 accent-primary" />הצג גם סטטוסים ללא לידים</label>
              <label className="relative"><span className="sr-only">חיפוש קמפיין או מודעה</span><Search className="pointer-events-none absolute start-2.5 top-2 size-3.5 text-foreground" aria-hidden="true" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="חיפוש קמפיין או מודעה" className="h-8 w-full ps-8 text-xs sm:w-52" /></label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 px-1 text-center text-xs text-foreground">
            <span>{formatNumber(campaigns.length)} קמפיינים{search.trim() ? " תואמים לחיפוש" : " מוצגים"}</span>
          </div>
          <div className="space-y-3">
            {campaigns.map((campaign) => <CampaignQualityCard key={campaign.id} campaign={campaign} groups={body.report.groups} expanded={expanded.has(campaign.id)} onToggle={() => toggleCampaign(campaign.id)} showZero={showZero} scale={scaleByCampaign.get(campaign.id)} scaleLoading={currentScale === null} scaleError={Boolean(currentScale?.error)} />)}
            {campaigns.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><CheckCircle2 className="mx-auto mb-3 size-6 text-foreground" aria-hidden="true" /><p className="text-sm font-semibold text-foreground">{search.trim() ? "לא נמצאו קמפיינים שתואמים לחיפוש" : "אין קמפיינים במסנן שנבחר"}</p><p className="mt-1 text-xs text-foreground">אפשר לשנות את החיפוש, את התקופה או את מסנן הקמפיינים.</p></div> : null}
          </div>
          {body.report.unassigned ? <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3 sm:p-4"><div><h2 className="text-sm font-bold text-amber-900">לידים ללא שיוך לקמפיין מוצג</h2><p className="mt-1 text-xs leading-5 text-amber-800">הלידים האלה מוצגים בנפרד ואינם נכללים בסיכום הקמפיינים. לא ניתן לחשב להם עלות לליד או לקבוע אם הקמפיין פעיל.</p></div><CampaignQualityCard campaign={body.report.unassigned} groups={body.report.groups} expanded={expanded.has(body.report.unassigned.id)} onToggle={() => toggleCampaign(body.report.unassigned!.id)} showZero={showZero} /></section> : null}
          {body.report.unlistedSpend > 0 ? <p className="flex items-start gap-2 px-1 text-xs leading-5 text-foreground"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span>נמצאה הוצאה נוספת של <bdi className="font-semibold">{formatCurrency(body.report.unlistedSpend)}</bdi> שאינה משויכת לקמפיין ברשימה. היא מוצגת בנפרד ואינה מתווספת לסיכום הקמפיינים.</span></p> : null}
        </>
      ) : null}
    </div>
  );
}
