"use client";

import { useState } from "react";
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
}

export function DashboardControls({ presetId, onPresetChange }: DashboardControlsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const activePreset = DATE_RANGE_PRESETS.find((preset) => preset.id === presetId) ?? DATE_RANGE_PRESETS[0];

  function handleRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    window.setTimeout(() => setIsRefreshing(false), 900);
  }

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
            {AD_ACCOUNTS[0].name}
          </Button>
        </TooltipTrigger>
        <TooltipContent>חיבור חשבון פרסום בפועל יתאפשר לאחר חיבור Meta Ads (שלב הבא)</TooltipContent>
      </Tooltip>

      <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
        <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
        {isRefreshing ? "מרענן..." : "רענון נתונים"}
      </Button>
    </div>
  );
}
