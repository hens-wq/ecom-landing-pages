"use client";

import { useEffect, useRef, useState } from "react";

interface SyncedScrollbarProps {
  /** Ref to the table's actual scrollable container (Table's forwarded ref from components/ui/table.tsx). */
  targetRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Bidirectional scrollLeft mirror between a slim bar and `targetRef` -
 * shared by TableTopScrollbar and TableBottomScrollbar so both stay in sync
 * with the table's real scroll position (and, transitively, with each
 * other) through that single source of truth, never a separate scroll
 * state of their own. Watches the table's content width via ResizeObserver
 * (column visibility toggles, data loading, etc. all change it without
 * necessarily resizing the container element itself).
 */
function useSyncedScrollbar(targetRef: React.RefObject<HTMLDivElement | null>) {
  const barRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const syncingFrom = useRef<"bar" | "target" | null>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    function updateWidth() {
      setContentWidth(target!.scrollWidth);
    }
    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(target);
    const tableEl = target.querySelector("table");
    if (tableEl) resizeObserver.observe(tableEl);

    function onTargetScroll() {
      if (syncingFrom.current === "bar") {
        syncingFrom.current = null;
        return;
      }
      syncingFrom.current = "target";
      if (barRef.current) barRef.current.scrollLeft = target!.scrollLeft;
    }
    target.addEventListener("scroll", onTargetScroll);

    return () => {
      resizeObserver.disconnect();
      target.removeEventListener("scroll", onTargetScroll);
    };
  }, [targetRef]);

  function onBarScroll() {
    if (syncingFrom.current === "target") {
      syncingFrom.current = null;
      return;
    }
    syncingFrom.current = "bar";
    const target = targetRef.current;
    if (target && barRef.current) target.scrollLeft = barRef.current.scrollLeft;
  }

  return { barRef, contentWidth, onBarScroll };
}

/**
 * A slim scrollbar pinned above the table, mirroring its real horizontal
 * scroll position both ways - so the user never has to scroll all the way
 * down to a long table before reaching its native scrollbar.
 */
export function TableTopScrollbar({ targetRef }: SyncedScrollbarProps) {
  const { barRef, contentWidth, onBarScroll } = useSyncedScrollbar(targetRef);
  if (contentWidth <= 0) return null;

  return (
    <div
      ref={barRef}
      onScroll={onBarScroll}
      className="overflow-x-auto border-b border-border"
      style={{ scrollbarWidth: "thin" }}
      aria-hidden="true"
    >
      <div style={{ width: contentWidth, height: 1 }} />
    </div>
  );
}

/**
 * A second slim scrollbar, rendered as the last element inside the table's
 * own card wrapper (see leads-table.tsx) with `sticky bottom-0`. Since that
 * wrapper is not itself a scroll container (the page/viewport is), plain
 * CSS sticky positioning keeps this pinned to the bottom of the viewport for
 * as long as any part of the table is still on screen, and lets it scroll
 * away naturally once the whole table has passed - the same "does this
 * still cover part of the table" question a JS-driven show/hide would need
 * an IntersectionObserver to answer, here answered for free by the browser.
 * Mirrors the SAME target as TableTopScrollbar (see useSyncedScrollbar) -
 * dragging either bar, or the table's own native scroll, keeps all three in
 * lockstep because they all read/write the exact same `target.scrollLeft`,
 * never an independent position of their own.
 */
export function TableBottomScrollbar({ targetRef }: SyncedScrollbarProps) {
  const { barRef, contentWidth, onBarScroll } = useSyncedScrollbar(targetRef);
  if (contentWidth <= 0) return null;

  return (
    <div
      ref={barRef}
      onScroll={onBarScroll}
      className="sticky bottom-0 z-20 overflow-x-auto border-t border-border bg-card"
      style={{ scrollbarWidth: "thin" }}
      aria-hidden="true"
    >
      <div style={{ width: contentWidth, height: 1 }} />
    </div>
  );
}
