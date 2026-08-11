import type { CSSProperties, ReactNode } from "react";
import type { CourseTheme } from "@/lib/types";

/**
 * Injects a course's theme (derived from its cover artwork) as CSS custom
 * properties for the wrapped subtree. Every themed component in the app
 * reads var(--course-*) instead of a hardcoded color, so this is the only
 * place course colors ever get set.
 */
export function CourseThemeProvider({
  theme,
  children,
  className,
}: {
  theme: CourseTheme;
  children: ReactNode;
  className?: string;
}) {
  const style = {
    "--course-primary": theme.primary,
    "--course-secondary": theme.secondary,
    "--course-soft": theme.soft,
    "--course-border": theme.border,
    "--course-glow": theme.glow,
    "--course-text-accent": theme.textAccent,
    "--course-gradient-from": theme.gradientFrom,
    "--course-gradient-to": theme.gradientTo,
  } as CSSProperties;

  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
}
