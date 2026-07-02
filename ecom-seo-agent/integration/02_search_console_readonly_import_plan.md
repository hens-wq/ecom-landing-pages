# 02 – תוכנית טכנית: ייבוא קריאה-בלבד מ-Google Search Console

**מצב: תכנון בלבד. לא מוטמע, לא מחובר, אין קרדנציאלים.**

## מטרה

לייבא נתוני ביצועים מ-Search Console **בקריאה בלבד**, ולשמור אותם בפורמט זהה לחלוטין לייצוא הידני שכבר נתמך היום ב-`scripts/search_console_analyzer.py` – כך שלא נדרש שינוי בסקריפט הניתוח הקיים.

## ארכיטקטורה מתוכננת

- **API:** Google Search Console API, method `searchanalytics.query` בלבד.
- **אימות:** Service Account (Google Cloud), עם קובץ JSON key.
- **Scope:** `https://www.googleapis.com/auth/webmasters.readonly` **בלבד** – לא `webmasters` (הסקופ הרחב יותר, שמאפשר גם הגשת/מחיקת sitemaps).
- **הרשאת property:** ה-service account מתווסף כ"משתמש" בהגדרות Search Console → **Settings → Users and permissions**, בהרשאת **Restricted** (המספיקה לקריאת דוחות ביצועים) – **לא** Owner.

## שלבים מתוכננים

1. בקשת פרמטרים: `site URL`, טווח תאריכים, dimensions (`query`, `page`, `date`), row limit.
2. קריאה יחידה ל-`searchanalytics.query` – **אין** קריאה לשום endpoint אחר (לא `sitemaps.*`, לא `urlInspection.*`).
3. המרת התוצאה לאותו מבנה CSV שהיה מתקבל מייצוא ידני של Search Console (עמודות Query/Page, Clicks, Impressions, CTR, Position) – כדי לשמור תאימות מלאה עם `scripts/search_console_analyzer.py` הקיים.
4. שמירה תחת `data/input/search_console_exports/gsc_import_<YYYY-MM-DD>.csv`.
5. הרצת `scripts/search_console_analyzer.py` הקיים על הקובץ – **ללא כל שינוי בסקריפט עצמו**.

## הגנות מתוכננות

- הקוד המתוכנן כולל **רק** קריאת GET-כמו ל-`searchanalytics.query` (טכנית POST ב-API של גוגל, אך סמנטית פעולת קריאה בלבד ללא שינוי מצב) – שום endpoint מסוג כתיבה לא ייקרא בשום ענף קוד.
- ה-OAuth token של ה-service account מוגבל מבחינת scope ל-`.readonly` – גם אם הקוד ינסה (בטעות) לקרוא ל-endpoint כותב, הבקשה תיכשל בהרשאה ברמת גוגל.
- אין אחסון של תוצאות גולמיות מעבר ל-CSV המקומי (אין מסד נתונים חיצוני בשלב זה).

## מה לא כלול בשלב זה

- אין שימוש ב-`sitemaps.submit` / `sitemaps.delete`.
- אין שימוש ב-URL Inspection API.
- אין בקשת אינדוקס.
- אין שינוי הגדרות property כלשהן.

## דרישות קדם לפני הטמעה בפועל

1. יצירת Service Account ב-Google Cloud (בביצוע המשתמש).
2. הגבלת ה-scope בקוד ל-`webmasters.readonly` בלבד.
3. הוספת ה-service account כמשתמש **Restricted** בהגדרות ה-property ב-Search Console.
4. אישור מפורש מהמשתמש להתחיל הטמעה.

פירוט הקרדנציאל המדויק: `05_credentials_checklist.md`.
