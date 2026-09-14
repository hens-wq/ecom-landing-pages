"use client";

import { CalendarRange, ChevronDown, Lock, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AD_ACCOUNTS, DATE_RANGE_PRESETS } from "@/lib/constants";
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
  const activePreset = DATE_RANGE_PRESETS.find((preset) => preset.id === presetId) ?? DATE_RANGE_PRESETS[0];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarRange className="size-4" />
            <span>
              טווח תאריכים: <span className="font-semibold">{activePreset.label}</span>
            </span>
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {DATE_RANGE_PRESETS.map((preset) => (
            <DropdownMenuItem
              key={preset.id}
              onSelect={() => onPresetChange(preset.id)}
              className={cn(preset.id === presetId && "bg-accent text-accent-foreground")}
            >
              {preset.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

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
