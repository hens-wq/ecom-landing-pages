import type { FAQItem } from "@/components/ui/FAQ";

// Same basePath-prefixing rule as brand-cyber.ts — see the comment there.
const ASSETS = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/landing/ai`;
// The Ecom + Ariel logos are brand-level assets (not one of the 10
// program-specific photos this page replaces) — reused from Cyber's
// folder in place rather than duplicated, so this file never needs to
// touch content/landing/brand-cyber.ts or public/landing/cyber/.
const SHARED_ASSETS = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/landing/cyber`;

/**
 * Copy for /lp/brand/ai — a structural clone of brand-cyber.ts.
 *
 * Per this round's brief: this is a visual/asset clone only. All Hebrew
 * copy below is intentionally byte-for-byte identical to brand-cyber.ts
 * (including section labels that still literally say "סייבר"/"SOC" —
 * e.g. cyberExperience's eyebrow/headline/topics) — real AI copy lands in
 * a future pass. Do not edit copy here without instruction; only asset
 * paths differ from brand-cyber.ts.
 */
export const aiContent = {
  hero: {
    logo: {
      src: `${SHARED_ASSETS}/logo-ecom.webp`,
      alt: "Ecom School",
    },
    headlineTop: "קורס סייבר",
    headlineBottom: "ב-10 חודשים בלבד",
    noBackgroundHook: "אפשר להתחיל גם ללא רקע קודם",
    salaryLabel: "פוטנציאל שכר של",
    salaryValue: "15,000 ₪",
    salarySuffix: "ומעלה",
    ctaLabel: "בדיקת התאמה ללא עלות",
    formTitle: "בדיקת התאמה מהירה",
    image: {
      src: `${ASSETS}/10-ai-hero-professional.webp`,
      label: "הירו — בוגר/ת צעיר/ה בסביבת SOC",
      description:
        "אדם צעיר (22–27), ישראלי/ת, בסביבת סייבר/SOC מודרנית ואותנטית — לא סטוק קורפורייטי, לא הודי, לא VR. מסכי ניטור ודאטה ברקע, תאורה אווירתית. קרופ פורטרט 4:5 למובייל, פנורמי כ-21:9 לדסקטופ.",
    },
  },

  trustBar: {
    bgSrc: `${ASSETS}/07-ai-bg-light.webp`,
    placement: { value: 87, decimals: 0, suffix: "%", label: "מבוגרי המכללה עובדים בהייטק" },
    reviews: {
      headline: "למעלה מ-300 ביקורות בגוגל!",
      rating: { value: 4.8, decimals: 1, suffix: "/5" },
    },
  },

  ariel: {
    bgSrc: `${ASSETS}/02-ai-bg-dark.webp`,
    statement:
      "תכנית הסייבר בפיקוח ואישור פדגוגי של היחידה ללימודי חוץ והמשך אוניברסיטת אריאל",
    logo: {
      src: `${SHARED_ASSETS}/logo-ariel.webp`,
      alt: "אוניברסיטת אריאל בשומרון — היחידה ללימודי חוץ והמשך",
    },
  },

  objection: {
    imageSrc: `${ASSETS}/04-ai-practical-training.webp`,
    headline: "לא צריך ניסיון קודם כדי להתחיל קריירה בסייבר",
    body: "המסלול בנוי גם למי שמתחיל מאפס - לומדים שלב אחרי שלב, מתרגלים ומפתחים את היכולות שצריך כדי להתקדם לעולם הסייבר.",
    steps: [
      "נרשמים לקורס סייבר של מכללת איקום",
      "לומדים מהבית עם המרצים המובילים בישראל",
      "מתחילים תהליך השמה לעבודה בליווי מלא שלנו",
      'נכנסים להייטק ומרוויחים 15,000 ש"ח ומעלה',
    ],
    ctaLabel: "בדקו אם סייבר מתאים לכם",
  },

  cyberExperience: {
    bgSrc: `${ASSETS}/01-ai-wide.webp`,
    eyebrow: "בתוך הקורס",
    headline: "עולם הסייבר, מהיום הראשון",
    body: "עובדים עם כלים ומצבים אמיתיים מהתעשייה — לא רק תיאוריה על הנייר.",
    topics: [
      { icon: "ShieldCheck", label: "הגנה על מערכות" },
      { icon: "Network", label: "רשתות ותקשורת" },
      { icon: "MonitorCheck", label: "SOC" },
      { icon: "Radar", label: "זיהוי וניתוח איומים" },
      { icon: "Lock", label: "אבטחת מידע" },
      { icon: "Terminal", label: "תרגול מעשי" },
      { icon: "Wrench", label: "כלים מהתעשייה" },
    ] as const,
    visual: {
      src: `${ASSETS}/08-ai-specialist.webp`,
      label: "ויזואליזציה — דשבורד ניטור SOC",
      description:
        "צילום מסך אמיתי (מטושטש פרטים רגישים) או ויזואליזציה מעוצבת של דשבורד ניטור/SOC — גרפים, מפת רשת, התרעות. יחס 16:9.",
    },
  },

  midForm: {
    bgSrc: `${ASSETS}/03-ai-bg-accent.webp`,
    headline: "רוצים לבדוק אם התחום מתאים לכם?",
    subheadline: "השאירו פרטים וקבלו ייעוץ לימודים ללא עלות",
    ctaLabel: "בדיקת התאמה ללא עלות",
  },

  career: {
    transitionSrc: `${ASSETS}/06-ai-team.webp`,
    eyebrow: "לא רק ללמוד סייבר",
    headline: "מתחילים בלימודים. ממשיכים לקריירה.",
    body: "אצלנו זה מתחיל בקורס וממשיך בליווי לקריירה ארוכה ויציבה בהייטק - עם תרגול מעשי, הכנה לעולם העבודה וליווי אישי גם אחרי הלימודים.",
    benefits: ["ללא צורך בידע קודם", "אנגלית בסיסית בלבד", "ליווי השמה עד 5 שנים"],
    steps: ["קורס", "תרגול מעשי", "הכנה לעולם העבודה", "ליווי השמה", "קריירה"],
    rolesLabel: "דוגמאות לתפקידי כניסה בתחום",
    roles: ["SOC Analyst", "Security Analyst"],
    supportNote: "ליווי אישי בתהליך ההשמה — בלי הבטחת העסקה או שכר.",
    visual: {
      src: `${ASSETS}/05-ai-career-office.webp`,
      label: "סביבת עבודה הייטק / סייבר",
      description:
        "אדם צעיר בסביבת עבודה הייטק אמיתית (לא סטודיו/סטוק גנרי) — תחושת המשך טבעי לאווירת ההירו. יחס 4:5.",
    },
  },

  faq: [
    {
      question: "האם צריך ידע קודם בסייבר?",
      answer:
        "לא. המסלול בנוי גם למי שמתחיל ללא ניסיון קודם בהייטק או בסייבר, ומתקדם בהדרגה מהבסיס לתרגול מעשי וכלים מקצועיים.",
    },
    {
      question: "איזו רמת אנגלית צריך?",
      answer:
        "אנגלית בסיסית מספיקה כדי להתחיל. בנוסף, במכללת Ecom ניתן לקבל העשרה באנגלית שתעזור להתמודד טוב יותר עם המונחים והכלים המקצועיים בתחום.",
    },
    {
      question: "מה קורה אחרי שמסיימים את הקורס?",
      answer:
        "הליווי לקריירה לא מסתיים ביום האחרון ללימודים. מחלקת ההשמה שלנו מלווה את הבוגרים בתהליך הכניסה לשוק העבודה, עם ליווי השמה של עד 5 שנים.",
    },
    {
      question: "איך מתנהלים הלימודים?",
      answer:
        "הלימודים מתקיימים אונליין בשיעורים חיים, עם הקלטות לצפייה חוזרת, כך שאפשר לשלב את הקורס עם עבודה ושגרה קיימת.",
    },
    {
      question: "מה הופך את המסלול של Ecom לפרקטי?",
      answer:
        "לומדים עם מרצים מהתעשייה, מתרגלים בסביבות מעשיות ועובדים עם כלים ותרחישים שמדמים את עולם העבודה האמיתי בסייבר.",
    },
  ] satisfies FAQItem[],

  final: {
    bgSrc: `${ASSETS}/09-ai-final-room.webp`,
    headline: "הצעד הראשון לקריירה בסייבר מתחיל כאן",
    subheadline: "בדיקת התאמה קצרה וללא עלות",
    ctaLabel: "בדיקת התאמה ללא עלות",
  },
} as const;
