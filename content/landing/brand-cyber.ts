import type { FAQItem } from "@/components/ui/FAQ";

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
    headlineTop: "קורס Cyber",
    headlineBottom: "ב-10 חודשים בלבד",
    noBackgroundHook: "אפשר להתחיל גם ללא רקע קודם",
    salaryLabel: "פוטנציאל שכר של",
    salaryValue: "15,000 ₪",
    salarySuffix: "ומעלה",
    salaryNote: "פוטנציאל שכר בתחום — לא הבטחת שכר",
    ctaLabel: "בדיקת התאמה ללא עלות",
    formTitle: "בדיקת התאמה מהירה",
    image: {
      label: "הירו — בוגר/ת צעיר/ה בסביבת SOC",
      description:
        "אדם צעיר (22–27), ישראלי/ת, בסביבת Cyber/SOC מודרנית ואותנטית — לא סטוק קורפורייטי, לא הודי, לא VR. מסכי ניטור ודאטה ברקע, תאורה אווירתית. קרופ פורטרט 4:5 למובייל, פנורמי כ-21:9 לדסקטופ.",
    },
  },

  trustBar: {
    stats: [
      { value: 87, decimals: 0, suffix: "%", label: "מבוגרי המכללה עובדים בהייטק" },
      { value: 300, decimals: 0, suffix: "+", label: "ביקורות Google" },
      { value: 4.8, decimals: 1, suffix: "/5", label: "דירוג Google" },
    ],
  },

  ariel: {
    eyebrow: "בפיקוח ואישור פדגוגי",
    statement:
      "תכנית ה-Cyber בפיקוח ואישור פדגוגי של היחידה ללימודי חוץ והמשך אוניברסיטת אריאל",
    logo: {
      label: "לוגו — היחידה ללימודי חוץ והמשך, אוניברסיטת אריאל",
      description: "לוגו רשמי בלבד כפי שנמסר על-ידי אוניברסיטת אריאל, על רקע שקוף.",
    },
  },

  objection: {
    headlineLight: "אין לכם רקע בסייבר?",
    headlineBold: "זה בדיוק בסדר",
    body: "התוכנית בנויה כך שאפשר להתחיל גם בלי ניסיון קודם בהייטק או בסייבר — צעד אחרי צעד, בקצב שמתאים למי שמתחיל מאפס.",
    steps: ["מתחילים ללא רקע", "מתרגלים", "בונים יכולות", "מתקדמים לעולם ה-Cyber"],
    ctaLabel: "בדקו אם Cyber מתאים לכם",
  },

  cyberExperience: {
    eyebrow: "בתוך הקורס",
    headline: "עולם ה-Cyber, מהיום הראשון",
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
      label: "ויזואליזציה — דשבורד ניטור SOC",
      description:
        "צילום מסך אמיתי (מטושטש פרטים רגישים) או ויזואליזציה מעוצבת של דשבורד ניטור/SOC — גרפים, מפת רשת, התרעות. יחס 16:9.",
    },
  },

  midForm: {
    headline: "רוצים לבדוק אם התחום מתאים לכם?",
    subheadline: "השאירו פרטים וקבלו ייעוץ לימודים ללא עלות",
    ctaLabel: "בדיקת התאמה ללא עלות",
  },

  career: {
    headlineTop: "לא רק ללמוד Cyber",
    headlineBottom: "להתחיל לבנות קריירה",
    body: "התוכנית בנויה להוביל משלב הלמידה ועד השלב שבו אתם נכנסים לתפקיד ראשון בתחום — עם ליווי אישי לאורך הדרך.",
    steps: ["קורס", "תרגול מעשי", "הכנה לעולם העבודה", "ליווי השמה", "קריירה"],
    rolesLabel: "דוגמאות לתפקידי כניסה בתחום",
    roles: ["SOC Analyst", "Security Analyst"],
    supportNote: "ליווי אישי בתהליך ההשמה — בלי הבטחת העסקה או שכר.",
    visual: {
      label: "סביבת עבודה הייטק / Cyber",
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
    headline: "הצעד הראשון לקריירה ב-Cyber מתחיל כאן",
    subheadline: "בדיקת התאמה קצרה וללא עלות",
    ctaLabel: "בדיקת התאמה ללא עלות",
  },
} as const;
