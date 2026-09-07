import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge doesn't know about our custom `--text-display-*` scale
 * (app/globals.css) — without this it silently drops those classes
 * whenever a plain text color utility is merged alongside them (both
 * fall under its default "text-*" ambiguity, and the color wins). This
 * registers the scale under the `font-size` group so a call like
 * `cn("text-display-xl", "text-brand-600")` keeps both instead of
 * losing the size.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display-sm", "display-md", "display-lg", "display-xl", "display-2xl", "display-3xl"] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
