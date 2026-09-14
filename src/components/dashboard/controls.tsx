"use client";

import { Lock, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DateRangeSelect } from "@/components/shared/date-range-select";
import { AD_ACCOUNTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface DashboardControlsProps {
  presetId: string;
  onPresetChange: (presetId: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  /** Real Meta ad account name once connected; falls back to the Phase 1 placeholder otherwise. */
  accountLabel?: string;
}

export function DashboardControls({ presetId, onPresetChange, onRefresh, isRefreshing, accountLabel }: DashboardControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DateRangeSelect presetId={presetId} onPresetChange={onPresetChange} />

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
