# קובץ אישור מקומי (Local Approval Log)

## מה זה

`approval_log.csv` הוא מנגנון האישור האנושי בפועל שמוזכר ב-`SAFE_INTEGRATION_PLAN.md` וב-`docs/09_APPROVAL_PROCESS.md`. זהו קובץ **מקומי**, תחת בקרת גרסה (git) – לא Google Sheet חי בשלב זה, כדי לא לדרוש שום קרדנציאל חדש. כל שינוי בקובץ ניתן למעקב מלא דרך `git diff` / `git log`.

## מבנה העמודות

| עמודה | תיאור |
|---|---|
| `item_id` | מזהה ייחודי לפריט (למשל `ART-2026-07-001`) |
| `item_type` | `article_draft` / `page_optimization` / אחר |
| `file_path` | נתיב לקובץ התוכן המלא תחת `data/output/...` |
| `title` | כותרת עבודה של הפריט |
| `target_keyword` | מילת מפתח יעד (לפי `docs/03_KEYWORD_STRATEGY.md`) |
| `content_status` | הסטטוס לפי מערכת הסטטוסים ב-`docs/09_APPROVAL_PROCESS.md` (`Draft` / `Needs review` / `Approved` וכו') |
| `compliance_check_result` | תוצאת בדיקת הציות האחרונה (`agent/compliance_checker.md`) |
| `wp_draft_clearance` | **שער נפרד מ-`content_status`.** `Yes`/`No` בלבד. ברירת המחדל תמיד `No`. |
| `cleared_by` | שם/מזהה האדם שאישר את `wp_draft_clearance=Yes` |
| `cleared_date` | תאריך האישור (YYYY-MM-DD) |
| `draft_created` | האם כבר נוצרה טיוטה בוורדפרס בפועל (`Yes`/`No`) – נכתב אוטומטית על ידי סקריפט היצירה, לא ידנית |
| `wp_post_id` | מזהה הפוסט בוורדפרס שנוצר (נכתב אוטומטית לאחר יצירה) |
| `wp_edit_link` | קישור לעריכת הטיוטה בוורדפרס (נכתב אוטומטית לאחר יצירה) |
| `notes` | הערות חופשיות |

## כלל הברזל: שני שערי אישור נפרדים

`content_status=Approved` **אינו** מספיק כדי ליצור טיוטת וורדפרס. נדרש בנוסף ובנפרד `wp_draft_clearance=Yes`, שנכתב **רק על ידי אדם**, ידנית, בקובץ עצמו. הסוכן לעולם לא כותב `Yes` בעמודה הזו מיוזמתו. ראו `SAFE_INTEGRATION_PLAN.md`, סעיף 6-7.

## איך משתמשים בקובץ (זרימת עבודה)

1. כאשר פריט תוכן מגיע לסטטוס `Approved` (לפי `docs/09_APPROVAL_PROCESS.md`), מוסיפים לו שורה בקובץ (או שהסוכן מציע שורה לאישור, אך לא ממלא `wp_draft_clearance`).
2. אדם סוקר את הפריט בפועל (את קובץ התוכן המלא, לא רק את השורה בטבלה).
3. אם מאשר – משנה ידנית `wp_draft_clearance` ל-`Yes`, וממלא `cleared_by` ו-`cleared_date`.
4. רק אז (ובעתיד, כשתוקם ההטמעה הטכנית לפי `integration/01_wordpress_draft_creation_plan.md`) ניתן ליצור טיוטה בפועל בוורדפרס.
5. לאחר יצירת הטיוטה, `draft_created`, `wp_post_id` ו-`wp_edit_link` מתמלאים אוטומטית לצורך מעקב.

## מצב נוכחי

הקובץ מכיל כרגע שורת דוגמה אחת בלבד (`EXAMPLE-001`), להמחשת הפורמט – **היא אינה אישור אמיתי** ואין לפעול לפיה. אין עדיין הטמעה טכנית שקוראת מקובץ זה (ראו `integration/01_wordpress_draft_creation_plan.md` ו-`integration/04_approval_gate_plan.md`) – בשלב הנוכחי זהו רק מנגנון התיעוד/המעקב הידני.

## שדרוג עתידי אפשרי ל-Google Sheet

אם וכאשר יוחלט לעבור לגיליון חי (כדי לאפשר עריכה נוחה יותר מהנייד/מהדפדפן), נדרש: יצירת Google Sheet יחיד, שיתופו באופן ספציפי עם service account ייעודי (**לא** הרשאת Drive רחבה), והחלפת שכבת הקריאה/כתיבה מ-`csv` ל-Sheets API. הלוגיקה (שני שערי אישור נפרדים, כתיבה אנושית בלבד לעמודת האישור) נשארת זהה. פירוט: `integration/04_approval_gate_plan.md` ו-`integration/05_credentials_checklist.md`.
