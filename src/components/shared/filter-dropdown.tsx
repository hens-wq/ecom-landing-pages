"use client";

import { ChevronDown, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface FilterOption {
  id: string;
  label: string;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}

/** Single-select filter dropdown (Campaign / Ad Set / Ad / Lead Source) with an "הכל" (All) option. Reuses the same DropdownMenu pattern as DateRangeSelect. */
export function FilterDropdown({ label, options, selectedId, onChange }: FilterDropdownProps) {
  const activeOption = selectedId ? options.find((o) => o.id === selectedId) : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="size-3.5" />
          <span>
            {label}: <span className="font-semibold">{activeOption?.label ?? "הכל"}</span>
          </span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
        <DropdownMenuItem
          onSelect={() => onChange(null)}
          className={cn(!selectedId && "bg-accent text-accent-foreground")}
        >
          הכל (All)
        </DropdownMenuItem>
        {options.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onSelect={() => onChange(option.id)}
            className={cn(option.id === selectedId && "bg-accent text-accent-foreground")}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
