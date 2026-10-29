/**
 * The enrolled-but-unpaid list the Leads page's red alert is built from. Shared
 * between the route that produces it and the component that renders it.
 */
export interface MissingPaymentLead {
  leadId: string;
  name: string | null;
  /** Canonical Israeli form, e.g. "0528678178". */
  phone: string | null;
  /** Calendar date the lead was created in Asia/Jerusalem, "YYYY-MM-DD". Null when the lead isn't found. */
  leadDate: string | null;
  /** False when no lead in the dashboard matches this status row's ID. */
  found: boolean;
}

export interface MissingPaymentResponse {
  count: number;
  leads: MissingPaymentLead[];
  /** False when the Meta lead list couldn't be read, so Meta leads show without their details. */
  metaAvailable: boolean;
}

/** "2026-10-08" -> "08.10.2026". */
export function formatLeadDateDisplay(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}
