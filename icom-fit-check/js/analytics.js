/* ============================================================
   שכבת מדידה ואנליטיקה (Data Layer)
   ------------------------------------------------------------
   כל אירוע נדחף ל־window.dataLayer בפורמט התואם Google Tag Manager.
   חיבור עתידי:
   - GTM: הוסיפו את קוד ה־Container ב־index.html — האירועים ייקלטו אוטומטית.
   - Meta Pixel: האזינו לאירועים דרך GTM או הוסיפו fbq() בתוך trackEvent.
   ============================================================ */

window.dataLayer = window.dataLayer || [];

const Analytics = {

  /** שמות אירועים אחידים לכל המשפך */
  events: {
    PAGE_VIEW: 'fit_page_view',            // כניסה לדף
    START_CLICK: 'fit_start_click',        // לחיצה על "מתחילים את הבדיקה"
    TRACK_SELECTED: 'fit_track_selected',  // בחירת תחום
    GAME_START: 'fit_game_start',          // התחלת משחק
    GAME_TIMEOUT: 'fit_game_timeout',      // הזמן נגמר לפני סיום
    GAME_RETRY: 'fit_game_retry',          // ניסיון נוסף אחרי טיימאאוט
    GAME_COMPLETE: 'fit_game_complete',    // השלמת משחק
    RESULT_SHOWN: 'fit_result_shown',      // הצגת תוצאה
    ADVISOR_CLICK: 'fit_advisor_click',    // לחיצה על "תפנו אותי ליועץ לימודים"
    ADVISOR_SHOWN: 'fit_advisor_shown',    // הצגת עמוד היועץ
    ADVISOR_SUBMIT: 'fit_advisor_submit',  // שליחת שאלון היועץ
    THANKS_SHOWN: 'fit_thanks_shown',      // הצגת דף התודה
    WHATSAPP_CLICK: 'fit_whatsapp_click',  // לחיצה לחזרה לוואטסאפ
  },

  /**
   * דחיפת אירוע ל־Data Layer.
   * @param {string} eventName - שם האירוע (מתוך Analytics.events)
   * @param {object} [params]  - פרמטרים נוספים (track, score וכו')
   */
  track(eventName, params = {}) {
    const payload = {
      event: eventName,
      page: 'icom-fit-check',
      timestamp: new Date().toISOString(),
      ...params,
    };
    window.dataLayer.push(payload);

    /* נקודת חיבור עתידית ל־Meta Pixel:
       if (typeof fbq === 'function') fbq('trackCustom', eventName, params); */

    if (window.CONFIG && window.CONFIG.debug) {
      console.info('[Analytics]', eventName, params);
    }
  },
};

window.Analytics = Analytics;
