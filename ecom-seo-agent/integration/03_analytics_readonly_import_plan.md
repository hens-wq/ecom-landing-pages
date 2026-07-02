# 03 – תוכנית טכנית: ייבוא קריאה-בלבד מ-Google Analytics (GA4)

**מצב: תכנון בלבד. לא מוטמע, לא מחובר, אין קרדנציאלים.**

## מטרה

לייבא דוחות תנועה/מעורבות מ-GA4 **בקריאה בלבד**, ולשמור אותם כ-CSV מקומי תואם למבנה שהמשתמש היה מוריד ידנית מ-GA4.

## ארכיטקטורה מתוכננת

- **API:** Google Analytics Data API (GA4), method `properties.runReport` בלבד.
- **אימות:** Service Account (ניתן להשתמש באותו service account כמו ב-Search Console, או service account נפרד – ראו `05_credentials_checklist.md`).
- **Scope:** `https://www.googleapis.com/auth/analytics.readonly` **בלבד**.
- **הרשאת property:** ה-service account מתווסף בהגדרות GA4 → **Admin → Property Access Management**, בתפקיד **Viewer** בלבד – **לא** Editor/Administrator.

## שלבים מתוכננים

1. בקשת פרמטרים: `property ID`, טווח תאריכים, מדדים (sessions, users, engagement rate, conversions וכו'), ממדים (page path, source/medium וכו').
2. קריאה יחידה ל-`runReport` – **אין** קריאה לשום endpoint שמשנה מצב (אין כאלה שנחשפים כרגיל ב-Data API, אך העיקרון נשמר: רק קריאות דוח).
3. המרת התוצאה ל-CSV, נשמר תחת `data/input/analytics_exports/ga4_import_<YYYY-MM-DD>.csv`.
4. ניתוח בהמשך ייעשה ידנית או דרך הרחבה עתידית של `scripts/` (לא קיים סקריפט GA ייעודי כרגע – ניתן להוסיף בעתיד לפי אותו דפוס כמו `search_console_analyzer.py`, רק כשיהיה צורך אמיתי בנתונים).

## הגנות מתוכננות

- Scope מוגבל ל-`.readonly` – כשל הרשאה אוטומטי ברמת גוגל אם ינוסה שימוש ב-endpoint כותב.
- תפקיד Viewer בלבד ב-property – לא ניתן לשנות הגדרות מעקב/אירועי המרה/קהלים גם אם ה-scope רחב מהמתוכנן, כי הגישה ל-property עצמו חסומה.
- ה-service account משותף **רק** ל-property הספציפי של איקום, לא ברמת ה-Google Analytics account כולו (אם יש properties נוספים).

## מה לא כלול בשלב זה

- אין עריכת אירועי המרה, קהלים, או כל הגדרת property.
- אין שימוש ב-Google Analytics Admin API לכתיבה.
- אין דוח GA ייעודי בסקריפטים עדיין – רק ייבוא הנתונים הגולמיים; הניתוח בפועל מתווסף בעתיד לפי צורך.

## דרישות קדם לפני הטמעה בפועל

1. יצירת/שימוש חוזר ב-Service Account (בביצוע המשתמש).
2. הגבלת ה-scope בקוד ל-`analytics.readonly` בלבד.
3. הוספת ה-service account כ-**Viewer** ב-Property Access Management של ה-property הרלוונטי.
4. אישור מפורש מהמשתמש להתחיל הטמעה.

פירוט הקרדנציאל המדויק: `05_credentials_checklist.md`.
