"use client";

import { Lock, RefreshCw } from "lucide-react";

import { CustomDateRangeSelect } from "@/components/shared/custom-date-range-select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DateRangeSelection } from "@/lib/advertising/date-range";
import { AD_ACCOUNTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface DashboardControlsProps {
  selection: DateRangeSelection;
  onSelectionChange: (selection: DateRangeSelection) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  /** Real Meta ad account name once connected; falls back to the Phase 1 placeholder otherwise. */
  accountLabel?: string;
}

export function DashboardControls({ selection, onSelectionChange, onRefresh, isRefreshing, accountLabel }: DashboardControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CustomDateRangeSelect selection={selection} onChange={onSelectionChange} />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" disabled className="gap-2 text-muted-foreground">
            <Lock className="size-3.5" />
            {accountLabel ?? AD_ACCOUNTS[0].name}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {accountLabel
            ? "מחובר לחשבון Meta Ads אמיתי - החלפת חשבון תתאפשר בשלב הבא"
            : "חיבור חשבון פרסום בפועל יתאפשר לאחר הגדרת Meta Ads"}
        </TooltipContent>
      </Tooltip>

      <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} className="gap-2">
        <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
        {isRefreshing ? "מרענן..." : "רענון נתונים"}
      </Button>
    </div>
  );
}
