import { cn } from "@/lib/utils";

/**
 * Small geometric motifs inspired by the ECOM course cover artwork:
 * dotted grids, thin diagonal lines and outline/filled triangles.
 * Kept purely decorative (aria-hidden) and low-opacity so they never
 * compete with content readability.
 */

export function DotGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute", className)}
      style={{
        backgroundImage:
          "radial-gradient(currentColor 1px, transparent 1px)",
        backgroundSize: "14px 14px",
      }}
    />
  );
}

export function DiagonalLines({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute", className)}
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
    >
      <line x1="10" y1="110" x2="60" y2="10" stroke="currentColor" strokeWidth="1.5" />
      <line x1="40" y1="115" x2="90" y2="15" stroke="currentColor" strokeWidth="1.5" />
      <line x1="70" y1="118" x2="118" y2="22" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function OutlineTriangle({
  className,
  size = 28,
  rotate = 0,
}: {
  className?: string;
  size?: number;
  rotate?: number;
}) {
  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <path d="M12 3L21 20H3L12 3Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function FilledTriangle({
  className,
  size = 16,
  rotate = 0,
}: {
  className?: string;
  size?: number;
  rotate?: number;
}) {
  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <path d="M12 3L21 20H3L12 3Z" />
    </svg>
  );
}

/**
 * A cluster of thin flowing curves in a teal-to-green gradient, used as a
 * quiet decorative ribbon in a corner. Purely atmospheric.
 */
export function FlowLines({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute", className)}
      width="420"
      height="260"
      viewBox="0 0 420 260"
      fill="none"
    >
      <path
        d="M0 176C60 138 100 214 160 184C220 154 240 78 320 98C368 110 392 60 420 40"
        stroke="url(#flowGrad)"
        strokeWidth="1.5"
      />
      <path
        d="M0 216C70 186 110 244 180 216C240 191 260 128 340 148C380 158 400 108 420 90"
        stroke="url(#flowGrad)"
        strokeWidth="1.5"
        opacity="0.7"
      />
      <path
        d="M0 138C50 110 90 168 150 144C210 120 230 62 300 76C350 86 380 42 420 22"
        stroke="url(#flowGrad)"
        strokeWidth="1.5"
        opacity="0.5"
      />
      <defs>
        <linearGradient id="flowGrad" x1="0" y1="0" x2="420" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-teal)" />
          <stop offset="1" stopColor="var(--brand-green)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Full corner treatment for a themed hero/card: a soft gradient wedge in one
 * corner, a dot grid and diagonal lines in another, plus a few scattered
 * triangles. Reads the current course theme via CSS variables, so it
 * automatically follows whichever CourseThemeProvider it's nested under.
 */
export function ThemedAccentBackground({
  className,
  wedgeCorner = "top-right",
}: {
  className?: string;
  wedgeCorner?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}) {
  const wedgePosition: Record<string, string> = {
    "top-right": "-top-16 -right-16",
    "top-left": "-top-16 -left-16",
    "bottom-right": "-bottom-16 -right-16",
    "bottom-left": "-bottom-16 -left-16",
  };

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {/* Gradient wedge */}
      <div
        className={cn("absolute size-56 rotate-45 rounded-3xl opacity-[0.07]", wedgePosition[wedgeCorner])}
        style={{
          background:
            "linear-gradient(135deg, var(--course-primary), var(--course-secondary))",
        }}
      />

      <DotGrid className="left-6 top-6 h-20 w-20 text-[var(--course-primary)] opacity-[0.18]" />
      <DiagonalLines className="left-1/2 top-0 h-24 w-24 text-[var(--course-primary)] opacity-[0.12]" />

      <OutlineTriangle
        className="right-10 top-8 text-[var(--course-primary)] opacity-25"
        size={22}
        rotate={12}
      />
      <FilledTriangle
        className="bottom-10 left-10 text-[var(--course-primary)] opacity-20"
        size={14}
        rotate={-20}
      />
      <OutlineTriangle
        className="bottom-16 right-24 text-[var(--course-secondary)] opacity-20"
        size={16}
        rotate={200}
      />
    </div>
  );
}
