import type { ReactNode } from "react";
import { AlertCircle, Clock, ImageOff, SearchX, ShieldAlert, Trash2, type LucideIcon } from "lucide-react";

import { CreativeImage } from "@/components/creative/creative-image";
import { Card, CardContent } from "@/components/ui/card";
import type { AdCreativeView, AdMeta, CreativeLookup, CreativeType } from "@/lib/creative/creative-lookup";
import { cn } from "@/lib/utils";

interface NoticeCopy {
  title: string;
  description: string;
  icon: LucideIcon;
}

/** Copy for every state that has no creative to show. Meta's own error messages are never displayed. */
const NOTICE_COPY: Record<
  "invalid_id" | "not_found" | "not_configured" | "no_permission" | "rate_limited" | "meta_error",
  NoticeCopy
> = {
  invalid_id: {
    title: "מזהה המודעה אינו תקין",
    description: "הקישור צריך לכלול מזהה מודעה של Meta, שמורכב מספרות בלבד (לדוגמה: 120248699384123). גם הצורה ag:120248699384123 נתמכת.",
    icon: AlertCircle,
  },
  not_found: {
    title: "לא נמצאה מודעה עם המזהה הזה",
    description: "ייתכן שהמזהה שגוי, או שהמודעה שייכת לחשבון פרסום אחר.",
    icon: SearchX,
  },
  not_configured: {
    title: "שירות הצגת המודעות אינו זמין כרגע",
    description: "פנו לצוות השיווק כדי לבדוק את החיבור ל-Meta.",
    icon: AlertCircle,
  },
  no_permission: {
    title: "אין לשרת הרשאה לקרוא את המודעה מ-Meta",
    description: "פנו לצוות השיווק כדי לעדכן את ההרשאות לחשבון הפרסום.",
    icon: ShieldAlert,
  },
  rate_limited: {
    title: "Meta מגבילה כרגע את מספר הבקשות",
    description: "נסו שוב בעוד כמה דקות.",
    icon: Clock,
  },
  meta_error: {
    title: "לא ניתן לטעון את המודעה מ-Meta כרגע",
    description: "אירעה שגיאה זמנית. נסו לרענן את העמוד בעוד רגע.",
    icon: AlertCircle,
  },
};

interface CreativeOutcomeProps {
  lookup: CreativeLookup;
  /** The normalized Ad ID from the URL, or null when the URL held no valid ID. */
  adId: string | null;
}

export function CreativeOutcome({ lookup, adId }: CreativeOutcomeProps) {
  switch (lookup.status) {
    case "ok":
      return <CreativeDetail creative={lookup.creative} />;
    case "removed":
      return (
        <NoticeCard
          icon={Trash2}
          title="המודעה הוסרה ואינה זמינה עוד"
          description="הקריאייטיב של המודעה כבר אינו זמין ב-Meta. מוצגים פרטי המודעה בלבד."
        >
          <AdMetaFields adId={adId} meta={lookup.meta} />
        </NoticeCard>
      );
    case "unavailable":
      return (
        <NoticeCard
          icon={ImageOff}
          title="הקריאייטיב של המודעה אינו זמין כרגע"
          description="Meta לא החזירה תמונה, סרטון או טקסט עבור המודעה. ודאו שהמזהה הוא של מודעה (Ad ID) ולא של קמפיין או סט מודעות."
        >
          <AdMetaFields adId={adId} meta={lookup.meta} />
        </NoticeCard>
      );
    default: {
      const copy = NOTICE_COPY[lookup.status];
      return <NoticeCard icon={copy.icon} title={copy.title} description={copy.description} />;
    }
  }
}

function NoticeCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 px-5 py-12 text-center">
        <Icon className="size-6 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function CreativeDetail({ creative }: { creative: AdCreativeView }) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <CreativeVisual creative={creative} />
      <Card>
        <CardContent className="space-y-5">
          <dl className="space-y-4">
            <Field label="כותרת (Headline)" value={creative.headline} />
            <Field label="טקסט ראשי (Primary Text)" value={creative.primaryText} multiline />
            <Field label="תיאור (Description)" value={creative.description} />
          </dl>
          <div className="border-t pt-5">
            <AdMetaFields adId={creative.adId} meta={creative} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CreativeVisual({ creative }: { creative: AdCreativeView }) {
  const { media, creativeType, cardCount } = creative;

  if (media.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-72 flex-col items-center justify-center gap-2 text-center">
          <ImageOff className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">התצוגה המקדימה של המודעה אינה זמינה כרגע.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {media.length > 1 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((item, index) => (
            <CreativeImage
              key={index}
              src={item.url}
              alt={`תצוגת המודעה ${index + 1} מתוך ${media.length}`}
              isVideo={item.kind === "video"}
              variant="thumb"
            />
          ))}
        </div>
      ) : (
        <CreativeImage src={media[0].url} alt="תצוגת המודעה" isVideo={media[0].kind === "video"} variant="main" />
      )}
      <VisualNote creativeType={creativeType} cardCount={cardCount} />
    </div>
  );
}

function VisualNote({ creativeType, cardCount }: { creativeType: CreativeType; cardCount: number | null }) {
  if (creativeType === "video") {
    return <p className="text-xs text-muted-foreground">מוצגת תמונת הנושא של הסרטון (thumbnail), לא הסרטון עצמו.</p>;
  }
  if (creativeType === "carousel") {
    return <p className="text-xs text-muted-foreground">קרוסלה של {cardCount} כרטיסים. מוצגים כל הכרטיסים לפי הסדר.</p>;
  }
  if (creativeType === "dynamic") {
    return (
      <p className="text-xs text-muted-foreground">
        מודעה דינמית: Meta מציגה שילובים שונים של תמונות וטקסטים לכל משתמש. מוצגים כל הנכסים של המודעה, ייתכן שהלקוח ראה שילוב אחר.
      </p>
    );
  }
  return null;
}

function AdMetaFields({ adId, meta }: { adId: string | null; meta: AdMeta }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
      <Field label="שם המודעה (Ad Name)" value={meta.adName} />
      <Field label="מזהה מודעה (Ad ID)" value={adId} ltr />
      <Field label="שם סט המודעות (Ad Set Name)" value={meta.adSetName} />
      <Field label="שם הקמפיין (Campaign Name)" value={meta.campaignName} />
    </dl>
  );
}

interface FieldProps {
  label: string;
  value: string | null;
  /** Identifiers and codes are shown left-to-right, monospaced. */
  ltr?: boolean;
  multiline?: boolean;
}

function Field({ label, value, ltr = false, multiline = false }: FieldProps) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        dir={ltr ? "ltr" : "auto"}
        className={cn(
          "text-sm text-foreground",
          ltr && "font-mono",
          multiline && "whitespace-pre-line",
          !value && "text-muted-foreground"
        )}
      >
        {value || "—"}
      </dd>
    </div>
  );
}
