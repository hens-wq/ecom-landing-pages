import type { FAQItem } from "@/components/ui/FAQ";

// Same basePath-prefixing rule as brand-cyber.ts — see the comment there.
const ASSETS = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/landing/ai`;
// The Ecom + Ariel logos are brand-level assets (not one of the 10
// program-specific photos this page replaces) — reused from Cyber's
// folder in place rather than duplicated, so this file never needs to
// touch content/landing/brand-cyber.ts or public/landing/cyber/.
const SHARED_ASSETS = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/landing/cyber`;

/**
 * Copy for /lp/brand/ai — same structural clone of brand-cyber.ts as
 * before (layout/animations/forms unchanged), now with the approved
 * AI-specific Hebrew copy in place of the temporary Cyber placeholder
 * text. A `\n` inside a headline/hook string is an intentional two-line
 * break (rendered via `whitespace-pre-line` at the call site) — not a
 * paragraph.
 */
export const aiContent = {
  hero: {
    logo: {
      src: `${SHARED_ASSETS}/logo-ecom.webp`,
      alt: "Ecom School",
    },
    headlineTop: "קורס AI למפתחים",
    headlineBottom: "לא רק להשתמש ב-AI\nללמוד לבנות איתו",
    supportingHook:
      "AI כבר נכנס כמעט לכל חברה - עכשיו זה הזמן ללמוד איך מפתחים איתו פתרונות אמיתיים",
    noBackgroundHook: "אפשר להתחיל גם ללא רקע קודם",
    salaryLabel: "פוטנציאל שכר של",
    salaryValue: "16,000 ₪",
    salarySuffix: "ומעלה",
    ctaLabel: "בדיקת התאמה ללא עלות",
    formTitle: "בדיקת התאמה מהירה",
    image: {
      src: `${ASSETS}/10-ai-hero-professional.webp`,
      label: "הירו — בוגר/ת צעיר/ה בסביבת AI",
      description:
        "אדם צעיר (22–27), ישראלי/ת, בסביבת AI/הייטק מודרנית ואותנטית — לא סטוק קורפורייטי, לא הודי, לא VR. מסכי ניטור ודאטה ברקע, תאורה אווירתית. קרופ פורטרט 4:5 למובייל, פנורמי כ-21:9 לדסקטופ.",
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
      "תכנית AI למפתחים בפיקוח ואישור פדגוגי של היחידה ללימודי חוץ והמשך אוניברסיטת אריאל",
    logo: {
      src: `${SHARED_ASSETS}/logo-ariel.webp`,
      alt: "אוניברסיטת אריאל בשומרון — היחידה ללימודי חוץ והמשך",
    },
  },

  objection: {
    imageSrc: `${ASSETS}/04-ai-practical-training.webp`,
    headline: "ה-AI כבר משנה את שוק העבודה\nהשאלה היא אם תדעו לבנות איתו",
    body: "המסלול בנוי כדי לקחת אתכם שלב אחרי שלב מעולם ה-AI אל היכולת לפתח כלים, אוטומציות ופתרונות שעובדים באמת",
    steps: [
      "נרשמים לקורס AI למפתחים של מכללת Ecom",
      "לומדים מהבית עם מרצים מהתעשייה ובונים פתרונות AI אמיתיים",
      "מתחילים תהליך השמה לעבודה בליווי מלא של צוות Ecom",
      "מתקדמים לקריירה בהייטק עם פוטנציאל שכר של 16,000 ₪ ומעלה",
    ],
    ctaLabel: "בדקו אם AI מתאים לכם",
  },

  cyberExperience: {
    bgSrc: `${ASSETS}/01-ai-wide.webp`,
    eyebrow: "בתוך הקורס",
    headline: "לא רק ללמוד AI\nלבנות דברים שעובדים",
    body: "עובדים בצורה מעשית עם כלי AI ומפתחים פתרונות שאפשר לקחת לעולם העבודה - בלי להישאר רק בתיאוריה",
    topics: [
      { icon: "Code2", label: "פיתוח אפליקציות עם AI" },
      { icon: "Workflow", label: "אוטומציות חכמות" },
      { icon: "Brain", label: "עבודה עם מודלים וכלי AI" },
      { icon: "Bot", label: "סוכני AI" },
    ] as const,
    visual: {
      src: `${ASSETS}/08-ai-specialist.webp`,
      label: "ויזואליזציה — עבודה עם כלי AI",
      description:
        "ויזואליזציה מעוצבת של עבודה עם מודלים/כלי AI — רשתות נוירונים, גרפים, נתונים. יחס 16:9.",
    },
  },

  midForm: {
    bgSrc: `${ASSETS}/03-ai-bg-accent.webp`,
    headline: "רוצים לבדוק אם תחום ה-AI מתאים לכם?",
    subheadline: "השאירו פרטים וקבלו ייעוץ לימודים ללא עלות",
    ctaLabel: "בדיקת התאמה ללא עלות",
  },

  career: {
    transitionSrc: `${ASSETS}/06-ai-team.webp`,
    eyebrow: "לא רק ללמוד AI",
    headline: "מתחילים בלימודים\nממשיכים לקריירה בעולם ה-AI",
    body: "AI כבר משתלב בחברות, במוצרים ובתהליכי עבודה כמעט בכל תחום. אצלנו הלימודים הם רק ההתחלה - משם ממשיכים לתרגול מעשי, הכנה לעולם העבודה וליווי אישי לקריירה",
    benefits: [
      "ללא צורך בידע קודם",
      "אנגלית בסיסית בלבד",
      "ליווי השמה עד 5 שנים",
      "לימודים אונליין עם הקלטות",
    ],
    steps: ["קורס AI למפתחים", "תרגול מעשי", "הכנה לעולם העבודה", "ליווי השמה", "קריירה בעולם ה-AI"],
    rolesLabel: "דוגמאות לתפקידי כניסה בתחום",
    roles: ["AI Developer", "AI Automation"],
    supportNote: "ליווי אישי בתהליך ההשמה — בלי הבטחת העסקה או שכר.",
    visual: {
      src: `${ASSETS}/05-ai-career-office.webp`,
      label: "סביבת עבודה הייטק עם AI",
      description:
        "אדם צעיר בסביבת עבודה הייטק אמיתית (לא סטודיו/סטוק גנרי) — תחושת המשך טבעי לאווירת ההירו. יחס 4:5.",
    },
  },

  faq: [
    {
      question: "האם צריך ידע קודם ב-AI או בתכנות?",
      answer:
        "לא. המסלול בנוי גם למי שמתחיל ללא ניסיון קודם, ומתקדם בהדרגה מהבסיס לעבודה מעשית עם כלי AI ופיתוח פתרונות",
    },
    {
      question: "מה לומדים לעשות בפועל?",
      answer:
        "לומדים לעבוד עם כלי AI, לבנות אוטומציות, לשלב AI באפליקציות ולפתח פתרונות מעשיים שמתאימים לעולם העבודה",
    },
    {
      question: "למה כדאי ללמוד AI עכשיו?",
      answer:
        "יותר ויותר חברות משלבות AI במוצרים, בשירות, בשיווק, בפיתוח ובתהליכי עבודה. היכולת לעבוד ולפתח עם AI הופכת לכלי מקצועי משמעותי יותר ויותר",
    },
    {
      question: "איזו רמת אנגלית צריך?",
      answer:
        "אנגלית בסיסית מספיקה כדי להתחיל. בנוסף, במכללת Ecom ניתן לקבל העשרה באנגלית שתעזור להתמודד טוב יותר עם המונחים והכלים המקצועיים בתחום",
    },
    {
      question: "מה קורה אחרי שמסיימים את הקורס?",
      answer:
        "הליווי לקריירה לא מסתיים ביום האחרון ללימודים. מחלקת ההשמה של Ecom מלווה את הבוגרים בתהליך הכניסה לשוק העבודה, עם ליווי השמה של עד 5 שנים",
    },
    {
      question: "AI לא יחליף את המפתחים?",
      answer:
        "AI משנה את הדרך שבה עובדים ומפתחים. מי שיודע להשתמש בו נכון ולבנות איתו מרחיב את ארגז הכלים המקצועי שלו ויכול להשתלב בעולם עבודה שבו AI הופך לחלק משמעותי יותר ויותר",
    },
  ] satisfies FAQItem[],

  final: {
    bgSrc: `${ASSETS}/09-ai-final-room.webp`,
    headline: "רוצים להיות אלה שבונים עם AI\nולא רק אלה שמשתמשים בו?",
    subheadline: "בדיקת התאמה קצרה וללא עלות",
    ctaLabel: "בדיקת התאמה ללא עלות",
  },
} as const;
