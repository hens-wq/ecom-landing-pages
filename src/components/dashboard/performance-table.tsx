"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Image as ImageIcon, Layers3, Megaphone } from "lucide-react";

import { ColumnVisibilityMenu } from "@/components/dashboard/column-visibility-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AdRow, AdSetRow, CampaignRow } from "@/lib/aggregate";
import { DEFAULT_VISIBLE_COLUMN_KEYS, PERFORMANCE_COLUMNS } from "@/lib/columns";
import type { DestinationType, PerformanceMetrics } from "@/lib/types";
import { cn } from "@/lib/utils";

const DESTINATION_LABELS: Record<DestinationType, string> = {
  standard_form: "טופס סטנדרטי (Standard Form)",
  rich_form: "טופס מורחב (Rich Form)",
  landing_page: "דף נחיתה (Landing Page)",
};

type FlatRow =
  | { type: "campaign"; row: CampaignRow }
  | { type: "adset"; row: AdSetRow }
  | { type: "ad"; row: AdRow };

function flattenRows(campaignRows: CampaignRow[], expanded: Set<string>): FlatRow[] {
  const flat: FlatRow[] = [];
  for (const campaign of campaignRows) {
    flat.push({ type: "campaign", row: campaign });
    if (!expanded.has(campaign.id)) continue;
    for (const adSet of campaign.adSets) {
      flat.push({ type: "adset", row: adSet });
      if (!expanded.has(adSet.id)) continue;
      for (const ad of adSet.ads) {
        flat.push({ type: "ad", row: ad });
      }
    }
  }
  return flat;
}

export function PerformanceTable({ campaignRows }: { campaignRows: CampaignRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(campaignRows.map((c) => c.id)));
  const [visibleKeys, setVisibleKeys] = useState<Set<keyof PerformanceMetrics>>(
    () => new Set(DEFAULT_VISIBLE_COLUMN_KEYS)
  );

  const flatRows = useMemo(() => flattenRows(campaignRows, expanded), [campaignRows, expanded]);
  const visibleColumns = useMemo(
    () => PERFORMANCE_COLUMNS.filter((column) => visibleKeys.has(column.key)),
    [visibleKeys]
  );

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleColumn(key: keyof PerformanceMetrics) {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            היררכיית ביצועים <span className="font-normal text-muted-foreground">(Campaign → Ad Set → Ad)</span>
          </h2>
          <p className="text-xs text-muted-foreground">לחצו על שורה כדי להרחיב ולראות את הרמה הבאה</p>
        </div>
        <ColumnVisibilityMenu visibleKeys={visibleKeys} onToggle={toggleColumn} />
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="sticky right-0 z-10 min-w-64 border-l border-border bg-card">שם (Name)</TableHead>
            <TableHead className="min-w-24">סטטוס (Status)</TableHead>
            {visibleColumns.map((column) => (
              <TableHead key={column.key} className={cn("text-left", column.highlight && "font-semibold text-foreground")}>
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {flatRows.map((flat) => {
            const isExpandable = flat.type !== "ad";
            const isExpanded = flat.type !== "ad" && expanded.has(flat.row.id);
            const depth = flat.type === "campaign" ? 0 : flat.type === "adset" ? 1 : 2;
            const Icon = flat.type === "campaign" ? Megaphone : flat.type === "adset" ? Layers3 : ImageIcon;

            return (
              <TableRow key={flat.row.id} className="group">
                <TableCell
                  className={cn(
                    "sticky right-0 z-10 border-l border-border bg-card group-hover:bg-muted/40",
                    flat.type === "campaign" && "font-semibold",
                    flat.type === "adset" && "font-medium"
                  )}
                  style={{ paddingInlineStart: `${depth * 22 + 12}px` }}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {isExpandable ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(flat.row.id)}
                        className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        aria-label={isExpanded ? "כיווץ שורה" : "הרחבת שורה"}
                        aria-expanded={isExpanded}
                      >
                        <ChevronDown className={cn("size-3.5 transition-transform", !isExpanded && "-rotate-90")} />
                      </button>
                    ) : (
                      <span className="size-5 shrink-0" />
                    )}
                    <Icon
                      className={cn(
                        "size-3.5 shrink-0",
                        flat.type === "campaign" ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span className="truncate">{flat.row.name}</span>
                    {flat.type === "ad" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                            {DESTINATION_LABELS[flat.row.destinationType].split(" ")[0]}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{DESTINATION_LABELS[flat.row.destinationType]}</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={flat.row.status} />
                </TableCell>
                {visibleColumns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      "text-left tabular-nums-he",
                      column.highlight ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {column.format(flat.row.metrics)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
