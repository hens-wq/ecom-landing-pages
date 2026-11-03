import { hasVerifiedExclusions, RECRUITMENT_NOT_EXCLUDED_MESSAGE } from "@/lib/campaign-scope";
import type { SpendReconciliation } from "@/lib/advertising/types";
import { formatCurrency } from "@/lib/format";

export interface SpendNotice {
  tone: "error" | "warning";
  text: string;
}

/**
 * The plain-language warnings about the spend figures, shared by the dashboard and the Leads page. A figure that is not
 * verified against Meta, or that is partial, is always announced, never shown as if it were complete.
 */
export function spendNotices(input: {
  reconciliation: SpendReconciliation | null;
  unlistedSpend: number;
  isLive: boolean;
  /** Whether a verified exclusion list is configured. Defaults to the app's own list. */
  verifiedExclusions?: boolean;
}): SpendNotice[] {
  const verifiedExclusions = input.verifiedExclusions ?? hasVerifiedExclusions();
  const notices: SpendNotice[] = [];
  if (input.isLive && !verifiedExclusions) {
    notices.push({ tone: "warning", text: RECRUITMENT_NOT_EXCLUDED_MESSAGE });
  }
  if (input.reconciliation && input.reconciliation.status !== "ok") {
    notices.push({ tone: "warning", text: input.reconciliation.message });
  }
  if (input.unlistedSpend > 0) {
    notices.push({
      tone: "warning",
      text: `נכללו ${formatCurrency(input.unlistedSpend)} הוצאה ממודעות שאינן ברשימה הנוכחית של Meta (למשל מודעות שנמחקו). ההוצאה מוצגת בשורה נפרדת וכלולה בסכומים, אבל אין לה לידים משויכים.`,
    });
  }
  return notices;
}
