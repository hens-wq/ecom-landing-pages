"use client";

import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PERFORMANCE_COLUMNS } from "@/lib/columns";
import type { PerformanceMetrics } from "@/lib/types";

interface ColumnVisibilityMenuProps {
  visibleKeys: Set<keyof PerformanceMetrics>;
  onToggle: (key: keyof PerformanceMetrics) => void;
}

export function ColumnVisibilityMenu({ visibleKeys, onToggle }: ColumnVisibilityMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="size-4" />
          עמודות
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-96 overflow-y-auto">
        <DropdownMenuLabel>הצגת עמודות</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PERFORMANCE_COLUMNS.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.key}
            checked={visibleKeys.has(column.key)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={() => onToggle(column.key)}
          >
            {column.labelHe} <span className="text-muted-foreground">({column.labelEn})</span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
