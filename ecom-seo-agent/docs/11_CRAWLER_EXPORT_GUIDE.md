# 11 – מדריך ייצוא מ-Crawler (Screaming Frog ואחרים)

## מטרה

מדריך זה מסביר בדיוק איך לייצא נתוני סריקת אתר לקובץ CSV אחד, בפורמט שהסוכן (ובפרט `scripts/content_inventory_parser.py`) יודע לקרוא – עבור תהליך מלאי התוכן (Workflow 2) ותהליך ה-SEO הטכני (Workflow 10, `docs/10_TECHNICAL_SEO_WORKFLOW.md`).

## איפה שומרים את הקובץ

```
data/input/website_exports/<שם-ברור>_<YYYY-MM-DD>.csv
```

לדוגמה: `data/input/website_exports/full_site_crawl_2026-07-15.csv`

קובץ לדוגמה עם הפורמט המדויק (נתונים דמה בלבד, **לא** תוכן אמיתי מהאתר) נמצא כאן: `data/input/website_exports/sample_crawler_export.csv`.

## עמודות מומלצות בקובץ ה-CSV

| עמודה | תיאור | חובה? |
|---|---|---|
| `url` | כתובת העמוד המלאה | חובה |
| `status_code` | קוד תגובת HTTP (200, 301, 302, 404, 500...) | חובה |
| `indexability` | האם העמוד ניתן לאינדוקס (`Indexable` / `Non-Indexable: <סיבה>`) | מומלץ מאוד |
| `title` | תגית ה-Title של העמוד | חובה |
| `title_length` | אורך הכותרת בתווים | מומלץ |
| `meta_description` | תיאור המטא | חובה |
| `meta_description_length` | אורך תיאור המטא בתווים | מומלץ |
| `h1` | תוכן תגית ה-H1 הראשונה | חובה |
| `h1_count` | כמה תגיות H1 יש בעמוד (0 = חסר, 2+ = כפול) | מומלץ מאוד |
| `h2` | תוכן תגיות H2 (אפשר לרכז כמה H2 בתא אחד, מופרדות ב-`;`) | אופציונלי |
| `word_count` | ספירת מילים בעמוד | חובה |
| `canonical` | ה-URL שמוגדר כ-canonical לעמוד | מומלץ מאוד |
| `robots_meta` | ערך תגית ה-meta robots (`index,follow` / `noindex,follow` וכו') | מומלץ מאוד |
| `inlinks` | מספר קישורים פנימיים נכנסים לעמוד | מומלץ |
| `outlinks` | מספר קישורים פנימיים יוצאים מהעמוד | אופציונלי |
| `page_type` | סוג העמוד (`course` / `blog` / `homepage` / `category` / `other`) | **לא נכלל אוטומטית בייצוא crawler – יש להוסיף ידנית** |
| `target_keyword` | מילת מפתח היעד של העמוד | **לא נכלל אוטומטית בייצוא crawler – יש להוסיף ידנית, לפי `docs/03_KEYWORD_STRATEGY.md`** |

**חשוב:** `page_type` ו-`target_keyword` הן העמודות היחידות שדורשות מילוי ידני אחרי הייצוא (למשל בגיליון Excel/Google Sheets, לפני שמירה כ-CSV) – כל שאר העמודות מיוצאות אוטומטית על ידי כלי הסריקה.

## הוראות שלב-אחר-שלב – Screaming Frog

1. פתחו את Screaming Frog SEO Spider והזינו את הדומיין (`https://www.ecomschool.co.il/`). שימו לב: הגרסה החינמית מוגבלת ל-500 URLs לסריקה – מספיק לרוב האתר, אך אם החסימה הזו מגיעה, אפשר לסרוק תת-נתיבים בנפרד (למשל רק `/blog/`).
2. לאחר סיום הסריקה, עברו ללשונית **Internal → HTML**.
3. לחצו **Export** ושמרו כ-CSV.
4. מיפוי עמודות מה-export של Screaming Frog לעמודות המומלצות שלנו:

| עמודה ב-Screaming Frog | עמודה אצלנו |
|---|---|
| Address | `url` |
| Status Code | `status_code` |
| Indexability / Indexability Status | `indexability` |
| Title 1 | `title` |
| Title 1 Length | `title_length` |
| Meta Description 1 | `meta_description` |
| Meta Description 1 Length | `meta_description_length` |
| H1-1 | `h1` |
| (ספירת H1 – ראו הערה למטה) | `h1_count` |
| H2-1 (וכן הלאה) | `h2` |
| Word Count | `word_count` |
| Canonical Link Element 1 | `canonical` |
| Meta Robots 1 | `robots_meta` |
| Unique Inlinks | `inlinks` |
| Unique Outlinks | `outlinks` |

**הערה על ספירת H1:** ה-export הסטנדרטי של Screaming Frog מציג עמודות נפרדות ל-H1-1 ו-H1-2 (אם יש שני H1). כדי לקבל עמודת `h1_count` נוחה, אפשר: (א) בגיליון האקסל, ליצור נוסחה שסופרת כמה מעמודות ה-H1 אינן ריקות, או (ב) להשתמש בדוח הייעודי **Bulk Export → H1 → All** של הכלי שמפרט כל H1 בנפרד ולעבד אותו מול הנתונים הראשיים.

5. הוסיפו ידנית את העמודות `page_type` ו-`target_keyword` (לפי `docs/03_KEYWORD_STRATEGY.md`).
6. שמרו את הקובץ הסופי ב-`data/input/website_exports/` לפי מוסכמת השם למעלה.

### Sitemap.xml ו-Robots.txt

אלה **אינם** שורות בקובץ ה-CSV (הם קבצים ברמת האתר, לא לכל עמוד). לבדיקתם:

- ב-Screaming Frog: תפריט **Sitemaps → Download XML Sitemap** לניתוח ה-sitemap הקיים, או פשוט פתחו `https://www.ecomschool.co.il/sitemap.xml` בדפדפן והדביקו את התוכן לקובץ `data/input/website_exports/sitemap.xml`.
- לגבי robots.txt: פתחו `https://www.ecomschool.co.il/robots.txt` בדפדפן והדביקו את התוכן לקובץ `data/input/website_exports/robots.txt`.

## כלים חלופיים (Sitebulb, Ahrefs Site Audit, SEMrush Site Audit)

אותו עיקרון: יצאו דוח "All URLs" / "Pages" מהכלי, ומפו את השדות שלו לעמודות המומלצות בטבלה למעלה (לרוב יש להם שמות עמודות דומים מאוד – Status Code, Title, Meta Description, H1, Word Count, Canonical, Indexability/Robots). אם לכלי אין שדה מסוים (למשל `h1_count`), אפשר להשאיר אותו ריק – הסקריפט מתמודד עם עמודות חסרות (ראו `scripts/README.md`).

## אין כלי סריקה זמין? חלופה ידנית

אם אין גישה לכלי crawler כלל, ניתן למלא את אותן עמודות ידנית עבור הדפים החשובים ביותר (דף בית + 4 דפי קורס בעדיפות + מספר פוסטי בלוג מרכזיים) ישירות בגיליון, ולשמור כ-CSV באותו פורמט. זו התחלה טובה גם אם לא מקיפה את כל האתר.

## אחרי הייצוא – איך מריצים

```bash
python3 scripts/content_inventory_parser.py data/input/website_exports/<שם הקובץ>.csv -o data/output/audits/content_inventory.md
```

ראו `scripts/README.md` לפרטים נוספים, ו-`docs/10_TECHNICAL_SEO_WORKFLOW.md` לאיך ממצאי הקובץ מוזנים לביקורת הטכנית.

## הערת זהירות

לפני העלאת קובץ crawler לפרויקט, ודאו שאינו כולל דפי `/wp-admin/`, טפסים עם מזהי משתמשים, או כל מידע רגיש אחר שנחשף בטעות בסריקה. הסקריפטים בפרויקט קוראים רק את העמודות המתועדות למעלה ומתעלמים משאר העמודות, אך עדיף לנקות את הקובץ מראש.
