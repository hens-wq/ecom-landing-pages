"use client";

import { useRef, useState } from "react";
import { CheckIcon, GripVertical, RotateCcw, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DashboardColumnsState } from "@/components/dashboard/use-dashboard-columns";
import { cn } from "@/lib/utils";

/** Must match the rendered row's height (h-8 below) - governs how far a drag has to travel before it counts as crossing into a neighboring row. */
const ROW_HEIGHT_PX = 32;

type ColumnVisibilityMenuProps = Pick<DashboardColumnsState, "orderedColumns" | "visibleKeys" | "toggleColumn" | "moveColumn" | "reset" | "hasCustomLayout">;

/** Every visible metric is draggable (grip handle) to reorder, and toggleable (click the row) to show/hide - see use-dashboard-columns.ts. The Name/Status identity column isn't in this list at all, so it can never be reordered or hidden. */
export function ColumnVisibilityMenu({ orderedColumns, visibleKeys, toggleColumn, moveColumn, reset, hasCustomLayout }: ColumnVisibilityMenuProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragStartYRef = useRef(0);
  const currentIndexRef = useRef(0);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>, index: number) {
    e.preventDefault();
    e.stopPropagation();
    setDragIndex(index);
    currentIndexRef.current = index;
    dragStartYRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragIndex === null) return;
    const deltaY = e.clientY - dragStartYRef.current;
    const steps = Math.trunc(deltaY / ROW_HEIGHT_PX);
    if (steps === 0) return;
    const from = currentIndexRef.current;
    const to = Math.min(orderedColumns.length - 1, Math.max(0, from + steps));
    if (to !== from) {
      moveColumn(from, to);
      currentIndexRef.current = to;
      dragStartYRef.current = e.clientY;
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDragIndex(null);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="size-4" />
          עמודות
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-96 overflow-y-auto">
        <DropdownMenuLabel>הצגה וסדר עמודות</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orderedColumns.map((column, index) => {
          const isVisible = visibleKeys.has(column.key);
          return (
            <div
              key={column.key}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-1 text-sm transition-colors hover:bg-accent",
                dragIndex === index && "bg-accent/70"
              )}
              style={{ height: ROW_HEIGHT_PX }}
            >
              <div
                onPointerDown={(e) => handlePointerDown(e, index)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                role="button"
                aria-label={`גרירה לשינוי סדר - ${column.labelHe}`}
                className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
              >
                <GripVertical className="size-3.5" />
              </div>
              <button
                type="button"
                onClick={() => toggleColumn(column.key)}
                className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-right"
              >
                <span
                  className={cn(
                    "flex size-3.5 shrink-0 items-center justify-center rounded-sm border border-input",
                    isVisible && "border-primary bg-primary text-primary-foreground"
                  )}
                >
                  {isVisible && <CheckIcon className="size-3" />}
                </span>
                <span className="truncate">
                  {column.labelHe} <span className="text-muted-foreground">({column.labelEn})</span>
                </span>
              </button>
            </div>
          );
        })}
        {hasCustomLayout && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={reset} className="gap-2 text-muted-foreground">
              <RotateCcw className="size-3.5" />
              איפוס תצוגת עמודות
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
