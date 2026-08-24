import type { FAQItem } from "@/components/ui/FAQ";

/**
 * SCAFFOLD CONTENT — placeholder copy used only to prove the page renders
 * end-to-end with real components. Everything here (headline, stats,
 * FAQ, image direction) is temporary and will be replaced once the Cyber
 * landing-page brief is provided. Content lives here, separate from
 * app/lp/brand/cyber/page.tsx, specifically so future copy testing
 * (headlines, hooks, CTA wording, section order) never requires touching
 * layout/component code.
 */
export const cyberContent = {
  eyebrow: "מכללת איקום",
  headline: "הכשרת סייבר שפותחת דלת לתפקיד הייטק ראשון",
  subheadline:
    "תוכנית מעשית עם ליווי אישי, שנבנתה יחד עם מעסיקים בתעשייה — לכל אחד, גם בלי רקע טכני קודם.",
  primaryCta: "לפרטים נוספים",
  hero: {
    label: "הירו — אווירת סייבר",
    description: "קומפוזיציה עם עומק ותאורה ייחודית, לא תמונת סטוק גנרית. קרופ ייעודי למובייל.",
    aspectMobile: "4/5",
    aspectDesktop: "16/9",
  },
  stats: [
    { value: 92, decimals: 0, suffix: "%", label: "השמה בתפקידי סייבר" },
    { value: 1200, decimals: 0, suffix: "+", label: "בוגרים בתעשייה" },
    { value: 4.9, decimals: 1, suffix: "/5", label: "דירוג בוגרים" },
  ],
  faq: [
    {
      question: "האם צריך רקע טכני קודם כדי להתחיל?",
      answer: "לא. התוכנית בנויה כך שמתאימה גם למי שמתחיל לגמרי מאפס.",
    },
    {
      question: "כמה זמן אורכת ההכשרה?",
      answer: "הלימודים משלבים תיאוריה ותרגול מעשי לאורך כמה חודשים, בהתאם למסלול שנבחר.",
    },
    {
      question: "האם יש ליווי במציאת עבודה בסיום?",
      answer: "כן — ליווי אישי אחד־על־אחד עד למציאת תפקיד בתחום.",
    },
  ] satisfies FAQItem[],
} as const;
