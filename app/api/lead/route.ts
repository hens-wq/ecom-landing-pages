import { NextResponse } from "next/server";
import { LANDING_PAGE_IDS, type LeadPayload } from "@/lib/types";
import { isValidEmail, isValidIsraeliPhone } from "@/lib/validation";

/**
 * Receives a lead from any landing page and forwards it on to the external
 * lead flow (Google Sheets / webhook -> Make -> Fireberry CRM).
 *
 * The destination is intentionally not wired up yet: set LEAD_WEBHOOK_URL
 * (server-side env var, never exposed to the client) once that flow exists.
 * Until then, submissions are validated and logged only — no real lead is
 * ever sent anywhere, matching this stage of the project.
 */
export async function POST(request: Request) {
  let payload: Partial<LeadPayload>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו תקין" }, { status: 400 });
  }

  const { fullName, phone, email, landingPageId } = payload;

  if (!fullName?.trim() || !phone?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }
  if (!isValidIsraeliPhone(phone)) {
    return NextResponse.json({ error: "מספר הטלפון אינו תקין" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "כתובת האימייל אינה תקינה" }, { status: 400 });
  }
  if (!landingPageId || !LANDING_PAGE_IDS.includes(landingPageId as never)) {
    return NextResponse.json({ error: "מזהה עמוד נחיתה חסר או שגוי" }, { status: 400 });
  }

  const webhookUrl = process.env.LEAD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.info("[lead:simulated]", {
      landingPageId,
      utm_source: payload.utm_source,
      utm_campaign: payload.utm_campaign,
    });
    return NextResponse.json({ ok: true, simulated: true });
  }

  try {
    const forwarded = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!forwarded.ok) {
      return NextResponse.json({ error: "שליחה ליעד החיצוני נכשלה" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "שליחה ליעד החיצוני נכשלה" }, { status: 502 });
  }
}
