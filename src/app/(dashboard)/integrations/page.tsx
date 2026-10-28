import { Database, FileSpreadsheet, Layout, Megaphone } from "lucide-react";

import type { IntegrationDef } from "@/components/integrations/integration-card";
import { IntegrationCard } from "@/components/integrations/integration-card";
import { getMetaConnectionStatus } from "@/lib/advertising";

// This page makes a live call to Meta (or checks env vars) on every load - it
// must never be statically cached at build time, or a token that expires (or
// gets configured) after the build would show a stale status forever.
export const dynamic = "force-dynamic";

const STATIC_INTEGRATIONS: IntegrationDef[] = [
  {
    id: "google-sheets",
    nameHe: "Google Sheets - מכירות",
    nameEn: "Google Sheets - Sales",
    icon: FileSpreadsheet,
    status: "ready_to_configure",
    description: "יספק נתוני מכירות שנסגרו, מסונכרנים לפי מספר טלפון של הלקוח.",
    willProvide: "מקור הנתונים לצד הימני של הדשבורד - מי באמת הפך ללקוח משלם.",
  },
  {
    id: "landing-pages",
    nameHe: "דפי נחיתה",
    nameEn: "Landing Pages",
    icon: Layout,
    status: "not_connected",
    description: "ישלח בעתיד שיוך לידים ואירועי Lead ישירות מדפי הנחיתה של Ecom.",
    willProvide: "יאפשר מעקב אחרי לידים שמגיעים מדף נחיתה ולא מטופס Meta.",
  },
  {
    id: "database",
    nameHe: "מסד נתונים",
    nameEn: "Database",
    icon: Database,
    status: "not_connected",
    description: "יאחסן את נתוני שיוך הלידים והתאמת המכירות באופן קבוע.",
    willProvide: "יחליף את נתוני הדמו הנוכחיים במקור אמת יחיד (Single Source of Truth).",
  },
];

async function buildMetaIntegration(): Promise<IntegrationDef> {
  const connection = await getMetaConnectionStatus();

  const base = {
    id: "meta-ads",
    nameHe: "Meta Ads",
    nameEn: "Meta Ads",
    icon: Megaphone,
    description: "מספק קמפיינים, סדרות מודעות, מודעות ונתוני ביצועי פרסום אמיתיים (קריאה בלבד).",
  };

  if (connection.status === "connected") {
    return {
      ...base,
      status: "connected",
      willProvide: "מקור הנתונים העיקרי לדשבורד - הוצאה, חשיפות, קליקים ולידים אמיתיים מהחשבון המחובר.",
      details: [
        { label: "שם חשבון", value: connection.account.name },
        { label: "מזהה חשבון", value: connection.account.id },
      ],
    };
  }

  if (connection.status === "connection_error") {
    return {
      ...base,
      status: "connection_error",
      willProvide: "מקור הנתונים העיקרי לצד השמאלי של הדשבורד - הוצאה, חשיפות, קליקים ולידים.",
      errorMessage: connection.message,
    };
  }

  return {
    ...base,
    status: "ready_to_configure",
    willProvide: "מקור הנתונים העיקרי לצד השמאלי של הדשבורד - הוצאה, חשיפות, קליקים ולידים.",
  };
}

export default async function IntegrationsPage() {
  const metaIntegration = await buildMetaIntegration();
  const integrations = [metaIntegration, ...STATIC_INTEGRATIONS];

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-2xl text-sm text-muted-foreground">
        כל החיבורים בשלב זה הם ממשק בלבד למעט Meta Ads, המחובר לקריאה בלבד כשמוגדרים משתני הסביבה. המבנה נבנה כך
        שכאשר יחוברו המקורות הנוספים, אין צורך לבנות מחדש את הדשבורד - רק להחליף את מקור הנתונים.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {integrations.map((integration) => (
          <IntegrationCard key={integration.id} integration={integration} />
        ))}
      </div>
    </div>
  );
}
