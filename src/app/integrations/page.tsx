import { Database, FileSpreadsheet, Layout, Megaphone } from "lucide-react";

import type { IntegrationDef } from "@/components/integrations/integration-card";
import { IntegrationCard } from "@/components/integrations/integration-card";

const INTEGRATIONS: IntegrationDef[] = [
  {
    id: "meta-ads",
    nameHe: "Meta Ads",
    nameEn: "Meta Ads",
    icon: Megaphone,
    status: "ready_to_configure",
    description: "יספק קמפיינים, סדרות מודעות, מודעות ונתוני ביצועי פרסום בזמן אמת.",
    willProvide: "מקור הנתונים העיקרי לצד השמאלי של הדשבורד - הוצאה, חשיפות, קליקים ולידים.",
  },
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

export default function IntegrationsPage() {
  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-2xl text-sm text-muted-foreground">
        כל החיבורים בשלב זה הם ממשק בלבד, ללא התחברות בפועל. המבנה נבנה כך שכאשר יחוברו המקורות האמיתיים, אין צורך
        לבנות מחדש את הדשבורד - רק להחליף את מקור הנתונים.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {INTEGRATIONS.map((integration) => (
          <IntegrationCard key={integration.id} integration={integration} />
        ))}
      </div>
    </div>
  );
}
