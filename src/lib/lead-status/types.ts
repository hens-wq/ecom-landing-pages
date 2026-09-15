/**
 * Ecom-internal lead lifecycle status - entirely separate from Meta. These
 * values are never written back to Meta (see repository.ts): Meta only ever
 * tells us a lead was captured, never what happened to it afterwards.
 *
 * The exact Hebrew strings below are the business's own vocabulary, verified
 * against the spec verbatim - do not rephrase or "clean up" them, since the
 * calculation functions in calculations.ts match against these exact string
 * values (e.g. "תשלום מלא" for a sale).
 */
export const MAIN_STATUSES = [
  "חדש",
  "אין מענה",
  "בתהליך",
  "לא מעוניין",
  "ליד שגוי",
  "רשימה שחורה",
  "ביטול הרשמה",
  "נרשם",
  "DATA",
] as const;

export type MainStatus = (typeof MAIN_STATUSES)[number];

export const SECONDARY_STATUSES_BY_MAIN: Record<MainStatus, readonly string[]> = {
  חדש: ["חדש"],
  "אין מענה": ['א"מ - יום 1', 'א"מ - יום 2', 'א"מ - יום 3', 'א"מ - יום 3 < הפסיק באמצע תהליך'],
  בתהליך: ["בתהליך"],
  "לא מעוניין": [
    'ל"מ - אין שיתוף פעולה',
    'ל"מ - הפסיק באמצע תהליך',
    'ל"מ - לו"ז \\ מבנה הקורס',
    'ל"מ - לא מעוניין ללמוד הייטק',
    'ל"מ - בחר בתואר אקדמי',
    'ל"מ - מתחרים',
    'ל"מ - פוטנציאל עתידי',
    'ל"מ - מחיר יקר',
    'ל"מ - אין יכולת כלכלית',
  ],
  "ליד שגוי": [
    "ליד שגוי - מכחיש פנייה",
    "ליד שגוי - חשב/ה בחינם",
    "ליד שגוי - חשב/ה מדובר בעבודה",
    'ליד שגוי - מס\' טלפון שגוי',
    "ליד שגוי - מבוגר",
    "ליד שגוי - קטין",
    "ליד שגוי - לא ענה מעולם",
    "ליד שגוי - לקוח קיים",
    "ליד שגוי - ליד כפול",
  ],
  "רשימה שחורה": ['ר"ש - תביעה', 'ר"ש - מסרב פניות', 'ר"ש - לקוח בעייתי'],
  "ביטול הרשמה": ["ביטל הרשמה - BDI שלילי", "ביטל הרשמה - לקוח התחרט"],
  נרשם: ["תשלום מלא", "תשלום חלקי"],
  DATA: ["דאטה"],
};

/** The two secondary values under "נרשם" that a sale can be recorded against - kept as a named export since calculations.ts, the payment-amount UI, and validation all need to check membership in exactly this set. */
export const SALE_SECONDARY_STATUSES = ["תשלום מלא", "תשלום חלקי"] as const;
export type SaleSecondaryStatus = (typeof SALE_SECONDARY_STATUSES)[number];

export function isMainStatus(value: string): value is MainStatus {
  return (MAIN_STATUSES as readonly string[]).includes(value);
}

export function isValidSecondaryStatus(mainStatus: MainStatus, secondaryStatus: string): boolean {
  return SECONDARY_STATUSES_BY_MAIN[mainStatus].includes(secondaryStatus);
}

/**
 * A lead that has never been manually touched is implicitly "חדש" / "חדש" -
 * not null/null - since "New" already means exactly that, and every piece of
 * UI/calculation code can then assume every lead always has a well-formed
 * status pair instead of needing a third "not yet set" state everywhere.
 */
export const DEFAULT_MAIN_STATUS: MainStatus = "חדש";
export const DEFAULT_SECONDARY_STATUS = "חדש";

/**
 * Ecom-internal business data attached to one Meta lead, keyed by Meta Lead
 * ID (see repository.ts - phone is kept only as a secondary matching aid,
 * never the primary key, since the same phone can have multiple leads).
 *
 * fullPaymentAmount and partialPaymentAmount are BOTH kept on the record even
 * though only one of them is ever "active" (counted) at a time, based on the
 * current secondaryStatus - switching secondary status back and forth must
 * never silently erase whichever amount isn't currently active (see
 * calculations.ts activePaymentAmount / components/leads/payment-inputs.tsx).
 */
export interface LeadStatusRecord {
  leadId: string;
  phone: string | null;
  mainStatus: MainStatus;
  secondaryStatus: string;
  fullPaymentAmount: number | null;
  partialPaymentAmount: number | null;
  updatedAt: string; // ISO datetime
}

/**
 * Whether the repository currently backing getLeadStatusRepository()
 * (lib/lead-status/repository.ts) is real, durable persistence - drives the
 * warning banner on the Leads page (components/leads/persistence-warning.tsx).
 * Lives here (not in repository.ts, which is server-only) so client
 * components can read it directly. Flip manually the day a real
 * implementation is wired in.
 */
export const LEAD_STATUS_PERSISTENCE_IS_REAL = false;

export function defaultLeadStatusRecord(leadId: string, phone: string | null): LeadStatusRecord {
  return {
    leadId,
    phone,
    mainStatus: DEFAULT_MAIN_STATUS,
    secondaryStatus: DEFAULT_SECONDARY_STATUS,
    fullPaymentAmount: null,
    partialPaymentAmount: null,
    updatedAt: new Date(0).toISOString(),
  };
}
