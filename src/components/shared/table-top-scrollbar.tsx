"use client";

import { useEffect, useRef, useState } from "react";

interface TableTopScrollbarProps {
  /** Ref to the table's actual scrollable container (Table's forwarded ref from components/ui/table.tsx). */
  targetRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * A slim scrollbar pinned above the table, mirroring its real horizontal
 * scroll position both ways - so the user never has to scroll all the way
 * down to a long table before reaching its native scrollbar. Watches the
 * table's content width via ResizeObserver (column visibility toggles,
 * data loading, etc. all change it without necessarily resizing the
 * container element itself).
 */
export function TableTopScrollbar({ targetRef }: TableTopScrollbarProps) {
  const topRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const syncingFrom = useRef<"top" | "target" | null>(null);

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
      if (syncingFrom.current === "top") {
        syncingFrom.current = null;
        return;
      }
      syncingFrom.current = "target";
      if (topRef.current) topRef.current.scrollLeft = target!.scrollLeft;
    }
    target.addEventListener("scroll", onTargetScroll);

    return () => {
      resizeObserver.disconnect();
      target.removeEventListener("scroll", onTargetScroll);
    };
  }, [targetRef]);

  function onTopScroll() {
    if (syncingFrom.current === "target") {
      syncingFrom.current = null;
      return;
    }
    syncingFrom.current = "top";
    const target = targetRef.current;
    if (target && topRef.current) target.scrollLeft = topRef.current.scrollLeft;
  }

  if (contentWidth <= 0) return null;

  return (
    <div
      ref={topRef}
      onScroll={onTopScroll}
      className="overflow-x-auto border-b border-border"
      style={{ scrollbarWidth: "thin" }}
      aria-hidden="true"
    >
      <div style={{ width: contentWidth, height: 1 }} />
    </div>
  );
}
