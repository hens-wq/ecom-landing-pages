"use client";

import { useRef } from "react";

interface ColumnResizeHandleProps {
  /** Hebrew column label, for the accessible name only. */
  label: string;
  /**
   * Called with the pixel delta since the last call (already RTL-adjusted:
   * positive always means "make the column wider", regardless of which
   * screen-space direction the pointer actually moved in). The caller owns
   * clamping to that column's min/max - this component only ever reports
   * deltas, never an absolute width, so it never needs to know the column's
   * current size.
   */
  onResize: (deltaPx: number) => void;
  onResizeEnd?: () => void;
}

/**
 * A thin draggable divider pinned to a header cell's left edge (this app is
 * always RTL - a column's "next" neighbor sits to its left, exactly mirroring
 * where a resize handle would sit in an LTR table). Coalesces pointermove
 * events to one `onResize` call per animation frame so a fast drag over a
 * wide table doesn't force a React re-render on every native move event.
 */
export function ColumnResizeHandle({ label, onResize, onResizeEnd }: ColumnResizeHandleProps) {
  const lastXRef = useRef(0);
  const pendingDeltaRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  function flush() {
    rafRef.current = null;
    const delta = pendingDeltaRef.current;
    pendingDeltaRef.current = 0;
    if (delta !== 0) onResize(delta);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    lastXRef.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.buttons === 0) return;
    pendingDeltaRef.current += lastXRef.current - e.clientX;
    lastXRef.current = e.clientX;
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(flush);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      flush();
    }
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    onResizeEnd?.();
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`שינוי רוחב עמודת ${label}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="group/resize absolute inset-y-0 left-0 z-20 w-2.5 -translate-x-1/2 touch-none select-none cursor-col-resize"
    >
      <div className="mx-auto h-full w-px bg-transparent group-hover/resize:bg-primary/50 group-active/resize:bg-primary" />
    </div>
  );
}
