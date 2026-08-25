import type { FAQItem } from "@/components/ui/FAQ";

const ASSETS = "/landing/cyber" as const;

/**
 * Copy for /lp/brand/cyber, kept separate from section components so
 * headlines/hooks/CTA wording/section order can be tested without
 * touching layout or animation code. All customer-facing claims here
 * (salary, Ariel supervision, career support) are phrased deliberately as
 * potential/support, never as a guarantee — do not loosen that wording
 * when editing.
 */
export const cyberContent = {
  hero: {
    eyebrow: "מכללת איקום",
    headlineTop: "קורס סייבר",
    headlineBottom: "ב-10 חודשים בלבד",
    noBackgroundHook: "אפשר להתחיל גם ללא רקע קודם",
    salaryLabel: "פוטנציאל שכר של",
    salaryValue: "15,000 ₪",
    salarySuffix: "ומעלה",
    salaryNote: "פוטנציאל שכר בתחום — לא הבטחת שכר",
    ctaLabel: "בדיקת התאמה ללא עלות",
    formTitle: "בדיקת התאמה מהירה",
    image: {
      src: `${ASSETS}/10-hero-dark-professional.webp`,
      label: "הירו — בוגר/ת צעיר/ה בסביבת SOC",
      description:
        "אדם צעיר (22–27), ישראלי/ת, בסביבת סייבר/SOC מודרנית ואותנטית — לא סטוק קורפורייטי, לא הודי, לא VR. מסכי ניטור ודאטה ברקע, תאורה אווירתית. קרופ פורטרט 4:5 למובייל, פנורמי כ-21:9 לדסקטופ.",
    },
  },

  trustBar: {
    bgSrc: `${ASSETS}/07-bg-light.webp`,
    stats: [
      { value: 87, decimals: 0, suffix: "%", label: "מבוגרי המכללה עובדים בהייטק" },
      { value: 300, decimals: 0, suffix: "+", label: "ביקורות Google" },
      { value: 4.8, decimals: 1, suffix: "/5", label: "דירוג Google" },
    ],
  },

  ariel: {
    bgSrc: `${ASSETS}/02-cyber-bg-dark.webp`,
    eyebrow: "בפיקוח ואישור פדגוגי",
    statement:
      "תכנית הסייבר בפיקוח ואישור פדגוגי של היחידה ללימודי חוץ והמשך אוניברסיטת אריאל",
    logo: {
      label: "לוגו — היחידה ללימודי חוץ והמשך, אוניברסיטת אריאל",
      description: "לוגו רשמי בלבד כפי שנמסר על-ידי אוניברסיטת אריאל, על רקע שקוף.",
    },
  },

  objection: {
    imageSrc: `${ASSETS}/04-practical-training.webp`,
    headlineLight: "אין לכם רקע בסייבר?",
    headlineBold: "זה בדיוק בסדר",
    body: "התוכנית בנויה כך שאפשר להתחיל גם בלי ניסיון קודם בהייטק או בסייבר — צעד אחרי צעד, בקצב שמתאים למי שמתחיל מאפס.",
    steps: ["מתחילים ללא רקע", "מתרגלים", "בונים יכולות", "מתקדמים לעולם הסייבר"],
    ctaLabel: "בדקו אם סייבר מתאים לכם",
  },

  cyberExperience: {
    bgSrc: `${ASSETS}/01-soc-wide.webp`,
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
      src: `${ASSETS}/08-female-analyst.webp`,
      label: "ויזואליזציה — דשבורד ניטור SOC",
      description:
        "צילום מסך אמיתי (מטושטש פרטים רגישים) או ויזואליזציה מעוצבת של דשבורד ניטור/SOC — גרפים, מפת רשת, התרעות. יחס 16:9.",
    },
  },

  midForm: {
    bgSrc: `${ASSETS}/03-ecom-bg-purple.webp`,
    headline: "רוצים לבדוק אם התחום מתאים לכם?",
    subheadline: "השאירו פרטים וקבלו ייעוץ לימודים ללא עלות",
    ctaLabel: "בדיקת התאמה ללא עלות",
  },

  career: {
    transitionSrc: `${ASSETS}/06-cyber-team.webp`,
    headlineTop: "לא רק ללמוד סייבר",
    headlineBottom: "להתחיל לבנות קריירה",
    body: "התוכנית בנויה להוביל משלב הלמידה ועד השלב שבו אתם נכנסים לתפקיד ראשון בתחום — עם ליווי אישי לאורך הדרך.",
    steps: ["קורס", "תרגול מעשי", "הכנה לעולם העבודה", "ליווי השמה", "קריירה"],
    rolesLabel: "דוגמאות לתפקידי כניסה בתחום",
    roles: ["SOC Analyst", "Security Analyst"],
    supportNote: "ליווי אישי בתהליך ההשמה — בלי הבטחת העסקה או שכר.",
    visual: {
      src: `${ASSETS}/05-career-office.webp`,
      label: "סביבת עבודה הייטק / סייבר",
      description:
        "אדם צעיר בסביבת עבודה הייטק אמיתית (לא סטודיו/סטוק גנרי) — תחושת המשך טבעי לאווירת ההירו. יחס 4:5.",
    },
  },

  faq: [
    {
      question: "אין לי רקע בסייבר — זה בכלל מתאים לי?",
      answer:
        "כן. התוכנית בנויה כך שרוב הלומדים מתחילים בלי שום ניסיון קודם בהייטק או בסייבר, ומתקדמים בהדרגה — צעד אחרי צעד.",
    },
    {
      question: "אני לא בטוח/ה שזה מתאים לי",
      answer:
        "אין צורך להחליט עכשיו. בדיקת ההתאמה היא קצרה, ללא עלות וללא התחייבות — היא בדיוק נועדה לענות על השאלה הזו.",
    },
    {
      question: "איך אמצא עבודה אחרי הלימודים?",
      answer:
        "התוכנית כוללת הכנה לעולם העבודה וליווי אישי בתהליך ההשמה. אנחנו לא מבטיחים העסקה או שכר — אבל לא משאירים אתכם לבד בדרך.",
    },
  ] satisfies FAQItem[],

  final: {
    bgSrc: `${ASSETS}/09-final-soc-room.webp`,
    headline: "הצעד הראשון לקריירה בסייבר מתחיל כאן",
    subheadline: "בדיקת התאמה קצרה וללא עלות",
    ctaLabel: "בדיקת התאמה ללא עלות",
  },
} as const;
