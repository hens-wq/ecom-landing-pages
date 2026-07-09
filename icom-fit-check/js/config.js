/* ============================================================
   מכללת איקום · בדיקת התאמה אינטראקטיבית
   קובץ הגדרות מרכזי — כל התכנים, הצבעים והקישורים במקום אחד.
   שינוי כאן משפיע על כל הדף, בלי לגעת בשאר הקוד.
   ============================================================ */

const CONFIG = {

  /* ---------- קישורים ---------- */

  // כפתור הוואטסאפ הוסר ממסך התוצאה. הקישור נשמר כאן למקרה שתרצו
  // להחזיר אותו בהמשך (הוראות ב־README).
  WHATSAPP_RETURN_URL: 'https://wa.me/972500000000',

  // כתובת Webhook עתידית (Make / CRM). כשהיא ריקה — הנתונים נשמרים מקומית ומודפסים ל־Console.
  WEBHOOK_URL: '',

  /* ---------- נכסי Nano Banana ---------- */

  // כל הנכסים נמצאים בתיקיית assets/img ומשולבים בדף.
  ASSETS_READY: true,

  // רקע האווירה הגלובלי (ערפילית + מעגלים מודפסים)
  AMBIENT_BG: 'assets/img/bg-ambient.jpg',

  // תמונת מסך התוצאה — כבויה
  RESULT_ART: { ready: false, src: 'assets/img/student-1.jpg' },

  // תמונת הסטודנטית מתחת לשאלות — כבויה, חוזרים לטבעת הדקורטיבית
  QUESTION_ART: { ready: false, images: ['assets/img/student-1.jpg'] },

  /* ---------- דמות ה־Hero במסך הפתיחה ---------- */

  hero: {
    // תמונת הדמות נכנסת לפורטל במקום הקומפוזיציה ההולוגרפית.
    ART_READY: true,
    art: 'assets/img/hero-character.jpg',
    // שורות הטרמינל המוקלדות בפורטל
    terminal: [
      '> icom.run(בדיקת_התאמה)',
      '> סורק פרופיל חשיבה…',
      '> מחשב ציון…',
      '> התאמה: 96% ✓',
    ],
  },

  /* ---------- ציון ---------- */

  // ציון דטרמיניסטי: 100 בברירת מחדל, מינוס 3 נקודות על כל שאלה/סבב עם טעות.
  score: {
    base: 100,
    penaltyPerMistake: 3,
  },

  /* ---------- תזמונים ---------- */

  timing: {
    countdownFrom: 3,          // ספירה לאחור לפני המשחק
    gameDurationMs: 40000,     // משך מקסימלי לאתגר (שאלות + משימת סיום)
    analysisDurationMs: 2400,  // משך מסך "ניתוח התוצאה"
    autoAdvanceAfterPickMs: 450,
  },

  /* ---------- צבעי מותג ---------- */

  brand: {
    purple: '#6836FF',
    teal:   '#34D1C3',
    green:  '#85ED72',
    bg:     '#050508',
  },

  /* ---------- טקסטים כלליים ---------- */

  texts: {
    introTitle: 'יש לכם ראש להייטק?',
    introSubtitle: 'בחרו קורס הייטק שמעניין אתכם, עברו אתגר קצר, וקבלו ציון התאמה אישי למסלול - תוך פחות מדקה',
    introCta: 'מתחילים באתגר',
    introSteps: ['בוחרים קורס', 'משתתפים באתגר', 'מקבלים תוצאה'],

    tracksTitle: 'איזה קורס בהייטק הכי מעניין אתכם?',
    tracksSubtitle: 'בחרו קורס אחד ובצעו אתגר קצר שמותאם במיוחד לתחום!',
    salaryLabel: 'שכר התחלתי:',

    gameIntroCta: 'הבנתי, מתחילים!',
    missionLabel: 'משימת סיום',
    retryFeedback: ['טעית — יש לכם הזדמנות נוספת 💪', 'לא מדויק — נסו שוב!'],

    timeoutTitle: 'אופס, הזמן נגמר',
    timeoutText: 'לא הספקתם לסיים את האתגר הפעם — קורה לטובים ביותר. מוכנים לניסיון נוסף?',
    timeoutCta: 'ניסיון נוסף',

    analysisTitle: 'מנתחים את הביצועים שלך',
    analysisLines: [
      'מודדים זמני תגובה…',
      'בודקים דיוק וזיהוי דפוסים…',
      'משווים לפרופיל הקורס…',
      'מחשבים ציון התאמה…',
    ],

    resultTitle: 'עברתם בהצלחה את בדיקת ההתאמה',
    resultScoreLabel: 'ציון ההתאמה שלך',
    resultCoursePrefix: 'קורס',
    resultDisclaimer: 'מדובר בבדיקת התאמה ראשונית וחווייתית — היא אינה מהווה הבטחה לקבלה ללימודים.',
    resultAdvisorCta: 'תפנו אותי ליועץ לימודים',
    resultCta: 'לבדוק קורס נוסף',

    countdownGo: 'צאו לדרך!',
    soundOn: 'הפעלת צלילים',
    soundOff: 'השתקת צלילים',
  },

  /* ---------- הקורסים ---------- */
  /* art — נכס Nano Banana (assets/img). מוצג רק כש־ASSETS_READY=true. */

  tracks: [
    {
      id: 'cyber',
      name: 'סייבר',
      desc: 'איתור חולשות והגנה מפני תקיפות',
      salary: '16,000 ש"ח',
      color: '#7C4DFF',
      color2: '#6836FF',
      art: 'assets/img/track-cyber.jpg',
      gameTitle: 'אתגר סייבר קצר',
      gameInstruction: 'שתי שאלות קצרות ומשימת סיום אחת יבדקו איך אתם מזהים איומים, נזהרים מניסיונות תקיפה ומגיבים בזמן אמת',
      gameIcon: '<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="#34D1C3" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="m6.5 9 3 3-3 3" stroke="#85ED72"/><path d="M12 15h5"/></svg>',
      resultLine: 'זיהיתם איומים, הבחנתם בניסיונות הונאה וקיבלתם החלטות נכונות בזמן אמת - התחלה מצוינת למסלול סייבר',
    },
    {
      id: 'ai',
      name: 'AI',
      desc: 'עבודה עם מודלים וכלים חכמים',
      salary: '14,500 ש"ח',
      color: '#9B6BFF',
      color2: '#34D1C3',
      art: 'assets/img/track-ai.jpg',
      gameTitle: 'לאמן את המודל',
      gameInstruction: 'שתי שאלות קצרות ומשימת סיום אחת יבדקו איך אתם חושבים על מערכות לומדות ומזינים אותן בדאטה הנכון',
      resultLine: 'הסקתם חוקים מתוך דוגמאות בדיוק כמו שמודל לומד — התאמה מצוינת לקורס ה-AI.',
    },
    {
      id: 'qa',
      name: 'QA ואוטומציה',
      desc: 'איתור באגים ובדיקת מערכות',
      salary: '11,000 ש"ח',
      color: '#85ED72',
      color2: '#34D1C3',
      art: 'assets/img/track-qa.jpg',
      gameTitle: 'ציד הבאגים',
      gameInstruction: 'שתי שאלות קצרות ומשימת סיום אחת יבדקו איך אתם מזהים טעויות וחושבים כמו אנשי QA',
      gameCta: 'מתחילים באתגר',
      gameIcon: '<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="#85ED72" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.9-4.9" stroke="#34D1C3"/><circle cx="10.5" cy="10.5" r="2.4" stroke="#34D1C3"/><path d="M10.5 4v2M10.5 15v2M4 10.5h2M15 10.5h2"/></svg>',
      resultLine: 'איתרתם בעיות במהירות, שמתם לב לפרטים הקטנים והפגנתם חשיבה מסודרת — בסיס מצוין למסלול QA ואוטומציה',
    },
    {
      id: 'fullstack',
      name: 'פיתוח Full Stack',
      desc: 'בניית אתרים ומערכות מקצה לקצה',
      salary: '15,000 ש"ח',
      color: '#34D1C3',
      color2: '#6836FF',
      art: 'assets/img/track-fullstack.jpg',
      gameTitle: 'חושבים כמו מתכנתים',
      gameInstruction: 'שתי שאלות קצרות ומשימת סיום אחת יבדקו איך אתם חושבים בלוגיקה, פועלים לפי תנאים ומחברים בין חלקי מערכת',
      gameIcon: '<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="#34D1C3" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m8 6-5 6 5 6M16 6l5 6-5 6" /><path d="m13.5 4-3 16" stroke="#6836FF"/></svg>',
      resultLine: 'פעלתם לפי סדר פעולות, הבנתם תנאים ותכננתם רצף נכון — יכולות חשובות מאוד בעולם התכנות והפיתוח',
    },
    {
      id: 'marketing',
      name: 'שיווק דיגיטלי ודאטה',
      desc: 'קמפיינים, תוכן וניתוח נתונים',
      salary: '12,000 ש"ח',
      color: '#5FE39A',
      color2: '#34D1C3',
      art: 'assets/img/track-marketing.jpg',
      gameTitle: 'בונים קמפיין מנצח',
      gameInstruction: 'שתי שאלות קצרות ומשימת סיום אחת יבדקו איך אתם מזהים קהל, מנתחים ביצועים ותופסים את התזמון הנכון',
      gameIcon: '<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="#5FE39A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" stroke="#34D1C3"/><circle cx="12" cy="12" r="5" stroke="#34D1C3"/><circle cx="12" cy="12" r="1.4" fill="#85ED72" stroke="none"/><path d="m12 12 6-6" stroke="#85ED72"/></svg>',
      resultLine: 'זיהיתם קהל מתאים, ניתחתם ביצועים וקיבלתם החלטת תקציב מבוססת נתונים — יכולות חשובות בעולם השיווק הדיגיטלי',
    },
    {
      id: 'uxui',
      name: 'עיצוב UX/UI',
      desc: 'יצירת מוצרים דיגיטליים נוחים ומעוצבים',
      salary: '11,000 ש"ח',
      color: '#B08CFF',
      color2: '#6836FF',
      art: 'assets/img/track-uxui.jpg',
      gameTitle: 'חושבים כמו מעצבים',
      gameInstruction: 'שתי שאלות קצרות ומשימת סיום אחת יבדקו איך אתם מזהים חוויה ברורה ומרכיבים מסך שנעים להשתמש בו',
      gameIcon: '<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="#B08CFF" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 8 4.5-8 4.5-8-4.5z"/><path d="m4 12.5 8 4.5 8-4.5" stroke="#34D1C3"/><path d="m4 17 8 4.5 8-4.5" stroke="#85ED72"/></svg>',
      resultLine: 'זיהיתם את צורכי המשתמש, יצרתם סדר ברור והתמקדתם בפעולות החשובות — יכולות מרכזיות בעולם ה־UX/UI',
    },
    {
      id: 'devops',
      name: 'DevOps',
      desc: 'חיבור בין קוד, מערכות ותשתיות ענן',
      salary: '16,000 ש"ח',
      color: '#4DDBB8',
      color2: '#85ED72',
      art: 'assets/img/track-devops.jpg',
      gameTitle: 'שומרים על המערכת באוויר',
      gameInstruction: 'שתי שאלות קצרות ומשימת סיום אחת יבדקו איך אתם מגיבים לתקלות, שומרים על יציבות ומפעילים את התהליך',
      gameIcon: '<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="#4DDBB8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 15.5a3.5 3.5 0 1 1 0-7c.3-2 2-3.5 4.5-3.5s4.2 1.5 4.5 3.5a3.5 3.5 0 1 1 0 7" stroke="#34D1C3"/><path d="M8 19h8M10 15.5v3.5M14 15.5v3.5" stroke="#85ED72"/></svg>',
      resultLine: 'הגבתם נכון לתקלה, חילקתם עומסים ושמרתם על יציבות המערכת — יכולות חשובות בעולם ה־DevOps',
    },
  ],


  /* ---------- אשף יועץ הלימודים (שלב אחד בכל מסך) ---------- */

  advisor: {
    // ויזואל הצלחה (Nano Banana) — הדליקו כשהקובץ בתיקייה
    // כבוי — הדמות מוצגת בגדול בכל שלב שאלה של האשף במקום כאווטאר קטן בפתיחה
    art: { ready: false, src: 'assets/img/student-1.jpg' },
    welcomeTitle: 'ברוכים הבאים למכללת Ecom',
    introText: 'עברת בהצלחה את בדיקת ההתאמה. נשארו רק 3 שאלות קצרות שיעזרו לנו להכיר אותך טוב יותר.',
    aboutBoxTitle: 'מכללת Ecom מובילה את תחום לימודי ההייטק בישראל!',
    aboutBoxText: [
      'מגוון מסלולים לבחירה, לימודים אונליין מכל מקום, מתאים גם למי שמגיע ללא רקע קודם ועם אנגלית בסיסית בלבד!',
      'זה הזמן שלכם להצטרף להצלחה ולהתחיל לבנות קריירה חדשה בהייטק!',
    ],
    introCta: 'ממשיכים לשאלות',
    about: [
      'לימודים פרקטיים עם מרצים מובילים',
      'בשיתוף היחידה ללימודי חוץ של אוניברסיטת אריאל',
      'ליווי אישי ומלא לעבודה בהייטק',
    ],
    questions: [
      {
        key: 'start_when',
        q: 'מתי הייתם רוצים להתחיל ללמוד?',
        sub: 'במחזורי הלימוד הקרובים נשארו מקומות אחרונים עם הטבות הרשמה מיוחדות.',
        options: ['כמה שיותר מהר! אני רוצה לקבל את ההטבה!', 'כנראה רק בעוד כמה חודשים'],
      },
      {
        key: 'callback_when',
        q: 'מתי נוח שיועץ לימודים יחזור אליכם?',
        sub: 'בחרו את הזמן שהכי מתאים לכם לשיחה קצרה על המסלול.',
        options: ['כמה שיותר מהר, אני זמין לשיחה!', 'בהמשך היום'],
      },
      {
        key: 'course_choice',
        q: 'רק לבדוק שלא טעיתי, איזה קורס מעניין אותך? 😉',
        options: 'tracks', // נבנה אוטומטית מרשימת הקורסים
      },
    ],
  },

  thanks: {
    title: 'הפרטים התקבלו בהצלחה',
    text: 'תודה על הזמן שהקדשתם. יועץ לימודים של מכללת איקום יצור אתכם קשר במועד שבחרתם ויעזור לכם להבין מהו המסלול המתאים ביותר עבורכם.',
  },

  /* ---------- שמירת נתונים ---------- */

  storage: {
    resultKey: 'icomFitCheck:lastResult',
    advisorKey: 'icomFitCheck:advisor',
    historyKey: 'icomFitCheck:history',
    soundKey: 'icomFitCheck:sound',
  },

  /* ---------- דיבאג ---------- */

  debug: true, // הדפסת אירועי אנליטיקה ל־Console
};

/* חשיפה גלובלית מסודרת */
window.CONFIG = CONFIG;
