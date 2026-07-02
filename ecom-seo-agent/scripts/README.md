# Scripts – עיבוד קבצי CSV מקומיים

כל הסקריפטים כאן הם **Python 3 סטנדרטי בלבד** (אין תלויות חיצוניות, אין pandas) ופועלים על קבצי CSV שהמשתמש הוריד/ייצא ידנית. הם **לא** מתחברים לשום API חי (לא WordPress, לא Search Console, לא Analytics). ראו `docs/07_SEARCH_CONSOLE_WORKFLOW.md` ו-`agent/tools.md` להקשר המלא.

## דרישות

Python 3.8+ בלבד, ללא ספריות נוספות להתקנה.

## content_inventory_parser.py

בונה טבלת מלאי תוכן (Markdown) מקובץ CSV של סריקת אתר.

```bash
python3 content_inventory_parser.py path/to/crawl_export.csv -o ../data/output/audits/content_inventory.md
```

**עמודות חובה ב-CSV:** `url,page_type,title,meta_description,h1,word_count,target_keyword`
**עמודות אופציונליות:** `search_intent,internal_links_out`

## metadata_auditor.py

בודק אורכי title/meta, שדות חסרים, כותרות כפולות, והתאמת מילת מפתח יעד.

```bash
python3 metadata_auditor.py path/to/pages.csv -o ../data/output/reports/metadata_audit.md
```

**עמודות חובה:** `url,title,meta_description,h1`
**עמודה אופציונלית:** `target_keyword`

## internal_link_mapper.py

מציע קישורים פנימיים ממאמרי בלוג לעמודי קורס (`page_type=course`) לפי חפיפת נושא/מילת מפתח, ומאתר עמודי עדיפות עם מעט קישורים נכנסים.

```bash
python3 internal_link_mapper.py path/to/content_inventory.csv -o ../data/output/reports/internal_link_suggestions.md
```

**עמודות חובה:** `url,page_type,main_topic,target_keyword`
**עמודה אופציונלית:** `current_internal_links` (URLs מופרדים ב-`;`)

## search_console_analyzer.py

מנתח ייצוא CSV מ-Google Search Console (טאב Queries או Pages, כפי שהוא מיוצא מה-UI).

```bash
# שאילתות עם חשיפה גבוהה ו-CTR נמוך
python3 search_console_analyzer.py gsc_queries.csv --mode low-ctr

# עמודים/שאילתות קרובים לעמוד 1 (דירוג 11-20)
python3 search_console_analyzer.py gsc_queries.csv --mode near-page-one

# עמודים שמאבדים תנועה (משווה שתי תקופות)
python3 search_console_analyzer.py gsc_pages_current.csv --previous gsc_pages_previous.csv --mode losing-traffic

# קניבליזציה - דורש ייצוא עם עמודות query וגם page (למשל דרך ה-API/Bulk export)
python3 search_console_analyzer.py gsc_query_page_export.csv --mode cannibalization
```

## schema_generator.py

מייצר JSON-LD מתוך קובץ שדות JSON. תואם ל-`templates/schema_template.md`. אוכף כללי ציות בסיסיים (לדוגמה: לא כולל מחיר/משך קורס אלא אם אושר כמופיע בעמוד בפועל, דורש שאלות/תשובות אמיתיות ל-FAQ).

```bash
python3 schema_generator.py --type course --input course_fields.json -o ../data/output/schema/tech-cyber_schema.json
python3 schema_generator.py --type faq --input faq_fields.json --html
```

סוגים נתמכים: `organization`, `educational_organization`, `course`, `breadcrumb`, `article`, `faq`.

## עקרון עבודה משותף לכל הסקריפטים

- אין הרצה אוטומטית מתוזמנת – כל הרצה יזומה ידנית.
- אין כתיבה חזרה לקבצי קלט (רק קריאה).
- פלט תמיד ל-`data/output/...` (או stdout אם לא צוין `-o`).
- כשל בקלט (עמודות חסרות, שדות חובה חסרים ב-schema) עוצר בהודעת שגיאה ברורה, ולא ממשיך עם ניחוש.
