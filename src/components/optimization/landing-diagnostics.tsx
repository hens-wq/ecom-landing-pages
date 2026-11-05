"use client";

import { useState } from "react";

import { Bilingual } from "@/components/optimization/shared";
import type { DateRange } from "@/lib/advertising/types";
import { formatCount, formatRangeDmy, formatRunTimestamp } from "@/lib/optimization/format";
import type { LandingDiagnosticResponse } from "@/lib/optimization/landing-pipeline";

interface LandingDiagnosticsProps {
  range: DateRange;
  /** Every campaign of the run, by ID and name. The diagnostic compares one campaign, chosen by its ID. */
  campaigns: Array<{ id: string; name: string }>;
}

/**
 * Read-only: one button runs the capture diagnostic for this range. It shows where the landing-page leads go, stage by
 * stage, with the reason for each drop. It shows IDs and times only, never a name, a phone or an e-mail.
 */
export function LandingDiagnostics({ range, campaigns }: LandingDiagnosticsProps) {
  const [campaignId, setCampaignId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LandingDiagnosticResponse | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setFailure(null);
    try {
      const params = new URLSearchParams({ since: range.since, until: range.until });
      if (campaignId) params.set("campaignId", campaignId);
      const response = await fetch(`/api/optimization/diagnostics/landing?${params.toString()}`, { cache: "no-store" });
      const body: unknown = await response.json();
      if (!response.ok) {
        setResult(null);
        setFailure(messageOf(body) ?? "האבחון לא הצליח. נסו שוב.");
        return;
      }
      setResult(body as LandingDiagnosticResponse);
    } catch {
      setResult(null);
      setFailure("האבחון לא הצליח לטעון. נסו שוב.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-900">
          <Bilingual en="Landing capture diagnostic" he="אבחון קליטת לידי דף הנחיתה" />
        </h3>
        <p className="text-xs text-slate-500">
          קריאה בלבד: לא משנה לידים, לא כותב כלום ולא שולח דבר ל-Meta. הטווח: {formatRangeDmy(range)}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-600">
          <span>קמפיין להשוואה (לפי מזהה)</span>
          <select
            aria-label="Campaign ID for the diagnostic"
            value={campaignId}
            onChange={(event) => setCampaignId(event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">ללא קמפיין להשוואה</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name} · {campaign.id}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? "בודק…" : "הרץ אבחון קליטה (קריאה בלבד)"}
        </button>
      </div>

      {failure ? <p className="text-sm text-red-700">{failure}</p> : null}
      {result ? <DiagnosticResult result={result} /> : null}
    </div>
  );
}

function DiagnosticResult({ result }: { result: LandingDiagnosticResponse }) {
  if (result.state === "unavailable") {
    return <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">{result.message}</p>;
  }

  const { report } = result;
  return (
    <div className="space-y-4">
      <p className={report.complete ? "text-sm text-emerald-800" : "text-sm text-red-800"}>{report.completeNote}</p>

      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[640px] text-right text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">שלב</th>
              <th className="px-3 py-2 font-semibold">מספר</th>
              <th className="px-3 py-2 font-semibold">סיבה</th>
            </tr>
          </thead>
          <tbody>
            {report.stages.map((stage) => (
              <tr key={stage.key} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2 text-slate-900">{stage.label}</td>
                <td className="px-3 py-2 font-semibold text-slate-900">{stage.count === null ? "—" : formatCount(stage.count)}</td>
                <td className="px-3 py-2 text-slate-700">{stage.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-600">לידים לדוגמה: מזהים ושעות בלבד (עד 5)</p>
        {report.samples.length === 0 ? (
          <p className="text-sm text-slate-600">אין לידים לדוגמה בטווח.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full min-w-[720px] text-right text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">מזהה ליד פנימי</th>
                  <th className="px-3 py-2 font-semibold">זמן שליחה</th>
                  <th className="px-3 py-2 font-semibold">campaign_id</th>
                  <th className="px-3 py-2 font-semibold">adset_id</th>
                  <th className="px-3 py-2 font-semibold">ad_id</th>
                  <th className="px-3 py-2 font-semibold">סיווג</th>
                </tr>
              </thead>
              <tbody>
                {report.samples.map((sample) => (
                  <tr key={sample.internalLeadId} className="border-t border-slate-100">
                    <td className="px-3 py-2"><span dir="ltr" className="font-mono">{sample.internalLeadId}</span></td>
                    <td className="px-3 py-2">{formatRunTimestamp(sample.submittedAt)}</td>
                    <td className="px-3 py-2"><span dir="ltr" className="font-mono">{sample.campaignId ?? "—"}</span></td>
                    <td className="px-3 py-2"><span dir="ltr" className="font-mono">{sample.adSetId ?? "—"}</span></td>
                    <td className="px-3 py-2"><span dir="ltr" className="font-mono">{sample.adId ?? "—"}</span></td>
                    <td className="px-3 py-2 text-slate-700">{sample.outcomeText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function messageOf(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("error" in body)) return null;
  const error = (body as { error?: { message?: unknown } }).error;
  return typeof error?.message === "string" ? error.message : null;
}
