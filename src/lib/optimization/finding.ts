import type { Finding } from "@/lib/optimization/model";

/** Builds a Finding with empty lists by default, so a rule only spells out what it concludes. */
export function makeFinding(
  input: Omit<Finding, "secondaryAction" | "flags" | "missingData" | "notes"> &
    Partial<Pick<Finding, "secondaryAction" | "flags" | "missingData" | "notes">>
): Finding {
  return { secondaryAction: null, flags: [], missingData: [], notes: [], ...input };
}
