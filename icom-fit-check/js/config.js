/* ============================================================
   מכללת איקום · בדיקת התאמה אינטראקטיבית
   קובץ הגדרות מרכזי — כל התכנים, הצבעים והקישורים במקום אחד.
   שינוי כאן משפיע על כל הדף, בלי לגעת בשאר הקוד.
   ============================================================ */

const CONFIG = {

  /* ---------- קישורים ---------- */

  // כתובת החזרה לוואטסאפ בסיום הבדיקה — החליפו את ה־Placeholder בקישור האמיתי.
  WHATSAPP_RETURN_URL: 'https://wa.me/972500000000?text=%D7%A1%D7%99%D7%99%D7%9E%D7%AA%D7%99%20%D7%90%D7%AA%20%D7%91%D7%93%D7%99%D7%A7%D7%AA%20%D7%94%D7%94%D7%AA%D7%90%D7%9E%D7%94',

  // כתובת Webhook עתידית (Make / CRM). כשהיא ריקה — הנתונים נשמרים מקומית ומודפסים ל־Console.
  WEBHOOK_URL: '',

  /* ---------- נכסי Nano Banana ---------- */

  // הנכסים הגרפיים נוצרו ב־Nano Banana ושמורים בספריית Pixelcut (קישור ההורדה ב־README).
  // אחרי שתורידו את הקבצים לתיקיית assets/img — שנו את הדגל ל־true
  // והכרטיסים יציגו את התמונות במקום אייקוני ה־SVG המובנים.
  ASSETS_READY: false,

  /* ---------- דמות ה־Hero במסך הפתיחה ---------- */

  hero: {
    // דמות שנוצרה ב־Nano Banana (שתי גרסאות בקישור השיתוף — בחרו אחת,
    // שמרו אותה בשם הקובץ שלמטה והפכו את הדגל ל־true).
    // כל עוד הדגל כבוי מוצגת צללית עיצובית מובנית.
    ART_READY: false,
    art: 'assets/img/hero-character.webp',
    // שבבי המידע הצפים סביב הדמות
    chips: [
      { text: 'התאמה 96', dot: true },
      { text: '&lt;/&gt;', mono: true },
      { text: 'AI · Cyber · UX', mono: false },
    ],
  },

  /* ---------- ציון ---------- */

  score: {
    min: 90,
    max: 100,
    // מאגר הציונים שמהם נבחר הציון (100 מוצג רק במקרים נדירים לשמירה על אמינות)
    pool: [92, 93, 94, 95, 96, 97, 98, 99],
    perfectScoreChance: 0.10,   // סיכוי ל־100 רק אם הביצוע היה מושלם ומהיר
  },

  /* ---------- תזמונים ---------- */

  timing: {
    countdownFrom: 3,          // ספירה לאחור לפני המשחק
    gameDurationMs: 10000,     // משך משחק מקסימלי
    analysisDurationMs: 2400,  // משך מסך "ניתוח התוצאה"
    autoAdvanceAfterPickMs: 450, // השהיה אחרי בחירת מסלול לפני מעבר למשחק
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
    badge: 'בדיקת התאמה · מכללת איקום',
    introTitle: 'כמה שניות מפרידות בינך לבין המסלול שמתאים לך',
    introSubtitle: 'בחרו תחום, השלימו משימה קצרה וקבלו את תוצאת ההתאמה שלכם',
    introCta: 'מתחילים את הבדיקה',
    introHint: 'פחות מדקה · בלי פרטים נוספים',
    introSteps: ['בוחרים תחום', 'משימה קצרה', 'תוצאת התאמה'],

    tracksTitle: 'איזה תחום הכי מסקרן אתכם?',
    tracksSubtitle: 'בחרו מסלול אחד — המשימה תותאם אליו',

    analysisTitle: 'מנתחים את הביצועים שלך',
    analysisLines: [
      'מודדים זמני תגובה…',
      'בודקים דיוק וזיהוי דפוסים…',
      'משווים לפרופיל המסלול…',
      'מחשבים ציון התאמה…',
    ],

    resultTitle: 'עברתם בהצלחה את בדיקת ההתאמה',
    resultScoreLabel: 'ציון ההתאמה שלך',
    resultDisclaimer: 'מדובר בבדיקת התאמה ראשונית וחווייתית — היא אינה מהווה הבטחה לקבלה ללימודים.',
    resultCta: 'להמשך התהליך בוואטסאפ',
    resultSecondary: 'לבדוק תחום נוסף',

    countdownGo: 'צאו לדרך!',
    soundOn: 'הפעלת צלילים',
    soundOff: 'השתקת צלילים',
  },

  /* ---------- המסלולים ---------- */
  /* art — נכס גרפי שנוצר ב־Nano Banana (assets/img). אם הערך null יוצג אייקון SVG בלבד. */

  tracks: [
    {
      id: 'cyber',
      name: 'סייבר התקפי',
      tagline: 'לחשוב כמו האקר, לפעול כמו מקצוען',
      color: '#7C4DFF',
      color2: '#6836FF',
      art: 'assets/img/track-cyber.webp',
      gameTitle: 'פריצה מתוזמנת',
      gameInstruction: 'לחצו בדיוק כשקו הסריקה חוצה את נקודת הפריצה',
      resultLine: 'הביצועים שלך מצביעים על תזמון מדויק, קור רוח וחשיבה תקיפה — בסיס מצוין לעולם הסייבר ההתקפי.',
    },
    {
      id: 'ai',
      name: 'AI',
      tagline: 'ללמד מכונות לחשוב — ולחשוב קדימה',
      color: '#9B6BFF',
      color2: '#34D1C3',
      art: 'assets/img/track-ai.webp',
      gameTitle: 'השלמת הדפוס',
      gameInstruction: 'זהו את החוקיות ובחרו את הצורה שממשיכה את הסדרה',
      resultLine: 'הביצועים שלך מצביעים על חשיבה מהירה, זיהוי דפוסים והתאמה ראשונית מצוינת לעולם ה־AI.',
    },
    {
      id: 'qa',
      name: 'QA ואוטומציה',
      tagline: 'העין החדה שמוצאת את מה שכולם פספסו',
      color: '#85ED72',
      color2: '#34D1C3',
      art: 'assets/img/track-qa.webp',
      gameTitle: 'ציד הבאגים',
      gameInstruction: 'משהו בממשק הזה שבור — מצאו את הבאג ולחצו עליו',
      resultLine: 'עין חדה לפרטים ואיתור מהיר של תקלות — בדיוק היכולות שמחפשים בעולם ה־QA והאוטומציה.',
    },
    {
      id: 'fullstack',
      name: 'Full Stack',
      tagline: 'לבנות מוצר שלם — מהמסך ועד השרת',
      color: '#34D1C3',
      color2: '#6836FF',
      art: 'assets/img/track-fullstack.webp',
      gameTitle: 'חיבור נכון',
      gameInstruction: 'חברו כל רכיב Frontend לשירות ה־Backend הנכון',
      resultLine: 'חיבור נכון בין רכיבים וראייה מערכתית רחבה — בסיס חזק לעולם ה־Full Stack.',
    },
    {
      id: 'marketing',
      name: 'שיווק דיגיטלי ודאטה',
      tagline: 'להפוך דאטה להחלטות שמזיזות מספרים',
      color: '#5FE39A',
      color2: '#34D1C3',
      art: 'assets/img/track-marketing.webp',
      gameTitle: 'הקמפיין המנצח',
      gameInstruction: 'קראו את הנתונים מהר ובחרו את הקמפיין עם הביצועים הטובים ביותר',
      resultLine: 'קריאת נתונים מהירה וקבלת החלטות מבוססת דאטה — התאמה ראשונית מצוינת לעולם השיווק הדיגיטלי.',
    },
    {
      id: 'uxui',
      name: 'UX/UI',
      tagline: 'לעצב חוויות שאנשים מתאהבים בהן',
      color: '#B08CFF',
      color2: '#6836FF',
      art: 'assets/img/track-uxui.webp',
      gameTitle: 'העין המעצבת',
      gameInstruction: 'שתי גרסאות של מסך — בחרו את הגרסה הנוחה והברורה יותר',
      resultLine: 'רגישות לחוויית המשתמש ובחירה אינטואיטיבית נכונה — בסיס מצוין לעולם ה־UX/UI.',
    },
    {
      id: 'devops',
      name: 'DevOps',
      tagline: 'המנוע שמריץ את עולם הטכנולוגיה בלי הפסקה',
      color: '#4DDBB8',
      color2: '#85ED72',
      art: 'assets/img/track-devops.webp',
      gameTitle: 'תיקון ה־Pipeline',
      gameInstruction: 'ה־Deployment נתקע — בחרו את הפעולה שתחזיר אותו למסלול',
      resultLine: 'הבנת תהליכים וזיהוי מהיר של נקודות קריטיות — חשיבה טבעית של DevOps.',
    },
  ],

  /* ---------- שמירת נתונים ---------- */

  storage: {
    resultKey: 'icomFitCheck:lastResult',
    historyKey: 'icomFitCheck:history',
    soundKey: 'icomFitCheck:sound',
  },

  /* ---------- דיבאג ---------- */

  debug: true, // הדפסת אירועי אנליטיקה ל־Console
};

/* חשיפה גלובלית מסודרת */
window.CONFIG = CONFIG;
