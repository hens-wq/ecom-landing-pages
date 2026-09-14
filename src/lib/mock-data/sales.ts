import type { Sale } from "@/lib/types";
import { normalizeIsraeliPhone } from "@/lib/phone";

/**
 * Mock rows as they would arrive from the future "Sales" Google Sheet: just a
 * customer name, phone, sale date and amount - no attribution. Phone formats are
 * deliberately written differently from the matching Lead's phone (see leads.ts)
 * to exercise normalization. Matching is phone-only (see lib/matching.ts) - a
 * few rows here use a different name than the lead on purpose (a spouse/
 * household name on the invoice, or a nickname) specifically to prove that a
 * name mismatch does NOT block a valid phone match.
 */
interface SaleSeed {
  id: string;
  customerName: string;
  phone: string;
  saleDateIso: string; // full date + time
  saleAmount: number;
}

const SALE_SEEDS: SaleSeed[] = [
  // --- Matched: normal case, phone (and, incidentally, name) agree with a lead in leads.ts ---
  { id: "sale-001", customerName: "דניאל אברג׳יל", phone: "054-112-2334", saleDateIso: "2026-08-19T16:00:00Z", saleAmount: 13500 },
  { id: "sale-002", customerName: "שירה גולן", phone: "0542233445", saleDateIso: "2026-08-17T12:00:00Z", saleAmount: 13500 },
  { id: "sale-003", customerName: "אורי פרידמן", phone: "0521237654", saleDateIso: "2026-08-18T18:45:00Z", saleAmount: 14000 },
  { id: "sale-004", customerName: "רועי אשכנזי", phone: "+972-50-123-4567", saleDateIso: "2026-08-25T13:15:00Z", saleAmount: 15000 },
  { id: "sale-005", customerName: "ליאור בן דוד", phone: "972509876543", saleDateIso: "2026-08-26T15:00:00Z", saleAmount: 15500 },
  { id: "sale-006", customerName: "אלון רזניק", phone: "052-111-2233", saleDateIso: "2026-08-16T10:00:00Z", saleAmount: 11000 },
  { id: "sale-007", customerName: "גיא נחום", phone: "+972587778899", saleDateIso: "2026-08-28T09:00:00Z", saleAmount: 12000 },
  { id: "sale-008", customerName: "עדי כספי", phone: "054-123-1234", saleDateIso: "2026-08-24T11:00:00Z", saleAmount: 11000 },
  { id: "sale-009", customerName: "בן חדד", phone: "972587001122", saleDateIso: "2026-09-05T10:00:00Z", saleAmount: 9800 },

  // --- Matched despite a different name on the sheet: phone is the only thing that decides the match. ---
  { id: "sale-010", customerName: "רונן שמעוני", phone: "0523334455", saleDateIso: "2026-08-17T20:00:00Z", saleAmount: 11500 },
  { id: "sale-011", customerName: "משפחת טל", phone: "050-111-2222", saleDateIso: "2026-08-28T14:00:00Z", saleAmount: 9000 },

  // --- Matched via multi-lead attribution: "חן" bought after TWO leads from the same phone
  // (lead-021 01/09, lead-022 08/09 - see leads.ts). Attributed to lead-022, the most recent
  // lead before this sale, even though the name here ("חן") doesn't match either lead in full. ---
  { id: "sale-016", customerName: "חן", phone: "+972-52-901-2345", saleDateIso: "2026-09-10T11:00:00Z", saleAmount: 11500 },

  // --- Needs review: phone is recognized (lead-023), but that lead is dated AFTER this sale -
  // there's no valid prior lead to credit, so it's flagged for a human instead of guessed. ---
  { id: "sale-017", customerName: "אלה רובין", phone: "056-334-5566", saleDateIso: "2026-08-25T10:00:00Z", saleAmount: 8700 },

  // --- Unmatched: no lead in the system has this phone number (referral / organic / untracked source) ---
  { id: "sale-012", customerName: "רון אביטן", phone: "0529998877", saleDateIso: "2026-08-21T10:00:00Z", saleAmount: 10500 },
  { id: "sale-013", customerName: "מיכל דגן", phone: "053-111-2222", saleDateIso: "2026-08-30T09:30:00Z", saleAmount: 12000 },
  { id: "sale-014", customerName: "אופיר לוי", phone: "+972544443322", saleDateIso: "2026-09-02T13:00:00Z", saleAmount: 9500 },
  { id: "sale-015", customerName: "חן ברקוביץ", phone: "0501239999", saleDateIso: "2026-09-06T15:30:00Z", saleAmount: 13000 },
];

export const sales: Sale[] = SALE_SEEDS.map((seed) => ({
  id: seed.id,
  customerName: seed.customerName,
  phone: seed.phone,
  normalizedPhone: normalizeIsraeliPhone(seed.phone),
  saleDate: seed.saleDateIso,
  saleAmount: seed.saleAmount,
}));
