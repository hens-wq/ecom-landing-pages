# תהליכי עבודה תפעוליים מלאים (10 תהליכים)

מסמך זה הוא ההגדרה התפעולית המדויקת (קלט → שלבים → פלט → תבנית → סטטוס פתיחה) לכל אחד מעשרת התהליכים. ההסבר העסקי/אסטרטגי נמצא ב-`docs/05_CONTENT_WORKFLOWS.md`, `docs/06_WORDPRESS_WORKFLOW.md`, `docs/07_SEARCH_CONSOLE_WORKFLOW.md`, `docs/08_BRAND_SERP_STRATEGY.md`.

---

## 1. ביקורת אתר SEO (SEO Site Audit)

- **קלט:** URL/עמוד לבדיקה, או תוכן שהודבק ידנית אם אין גישת רשת (`data/input/website_exports/`).
- **שלבים:** בדיקת title/H1/meta → בדיקת מבנה כותרות → זיהוי תוכן דל/כפול → בדיקת קישורים פנימיים → בדיקת הזדמנויות Schema → בדיקת טענות מול `docs/02_SEO_RULES_AND_COMPLIANCE.md`.
- **תבנית:** `templates/seo_audit_template.md`
- **פלט:** `data/output/audits/<slug>_audit_<date>.md`
- **סטטוס פתיחה:** `Draft`

## 2. מלאי תוכן קיים (Content Inventory)

- **קלט:** רשימת URLs (ייצוא crawler / sitemap / הזנה ידנית), אופציונלי: `scripts/content_inventory_parser.py` על קובץ CSV.
- **שלבים:** לכל URL – מילוי 15 השדות (URL, סוג עמוד, נושא, מילת מפתח יעד, כוונת חיפוש, כותרת נוכחית/מוצעת, meta נוכחי/מוצע, H1, קישורים קיימים/חסרים, ציון איכות, סיכון ציות, פעולה מומלצת).
- **תבנית:** `templates/seo_audit_template.md` (טבלת המלאי המרכזית)
- **פלט:** `data/output/audits/content_inventory.md` (קובץ חי, מתעדכן – לא נוצר מחדש בכל פעם)
- **סטטוס פתיחה:** `Draft`

## 3. מיפוי מילות מפתח (Keyword Mapping)

- **קלט:** מילת מפתח חדשה/קיימת + `docs/03_KEYWORD_STRATEGY.md` + `data/output/audits/content_inventory.md`.
- **שלבים:** חיפוש התנגשות → אם אין התנגשות: הוספה לטבלת המיפוי → אם יש התנגשות: התראת קניבליזציה + הצעת פתרון (מיזוג/redirect/בידול intent).
- **פלט:** עדכון `docs/03_KEYWORD_STRATEGY.md` + (אם רלוונטי) קובץ התראה ב-`data/output/reports/cannibalization_alert_<date>.md`
- **סטטוס פתיחה:** אין (עדכון מסמך אסטרטגיה, לא פריט תוכן בפני עצמו)

## 4. אופטימיזציית On-Page

- **קלט:** URL/עמוד קיים + ממצאי audit (תהליך 1) + מיפוי מילות מפתח (תהליך 3).
- **שלבים:** ניסוח כותרת SEO → meta description → המלצת H1 → מבנה H2/H3 → תוכן above-the-fold → בלוק FAQ → קישורים פנימיים + אנקור טקסט → המלצת Schema → alt לתמונות → שיפורי CTA → בדיקת ציות (`agent/compliance_checker.md`).
- **תבנית:** `templates/page_optimization_template.md`
- **פלט:** `data/output/page_optimizations/<page-slug>_optimization.md`
- **סטטוס פתיחה:** `Draft`

## 5. אסטרטגיית בלוג ותוכן

- **קלט:** אשכול מילות מפתח (`docs/03_KEYWORD_STRATEGY.md`) + פערים מ-audit/מחקר מתחרים.
- **שלבים (רמת תוכנית):** בחירת 10 נושאים לפי עדיפות → לכל נושא: בריף (`templates/content_brief_template.md`).
- **שלבים (רמת מאמר בודד):** מילוי `templates/article_template.md` במלואו (מטרה, מילות מפתח, אאוטליין, טיוטה מלאה, FAQ, CTA, Schema) → בדיקת ציות.
- **פלט:** תוכנית: `data/output/content_plans/<cluster>_plan_<YYYY-MM>.md`; מאמר: `data/output/article_drafts/<slug>.md`
- **סטטוס פתיחה:** `Draft`

## 6. הכנת טיוטות וורדפרס

- **קלט:** תוכן שכבר במעמד `Approved` (מתהליך 4 או 5).
- **שלבים:** מיפוי לפורמט יעד (פוסט חדש / עדכון עמוד Elementor) → מילוי שדות מטא-דאטה SEO → הכנת HTML/טקסט מוכן להדבקה → הוראות העלאה ידניות.
- **תבנית:** `templates/wordpress_draft_template.md`
- **פלט:** `data/output/article_drafts/<slug>_wp_draft.md` או `data/output/page_optimizations/<slug>_wp_draft.md`
- **סטטוס פתיחה:** `Ready for WordPress draft` (רק לאחר `Approved`)

## 7. תהליך Search Console / Analytics

- **קלט:** קבצי CSV מ-`data/input/search_console_exports/` ו/או `data/input/analytics_exports/`.
- **שלבים:** הרצת `scripts/search_console_analyzer.py` → הפקת 8 סוגי הדוחות (ראו `docs/07_SEARCH_CONSOLE_WORKFLOW.md`) → חיבור ממצאים לתהליך 3 (קניבליזציה) ותהליך 4 (עמודים לחיזוק).
- **תבנית:** `templates/monthly_report_template.md`
- **פלט:** `data/output/reports/`
- **סטטוס פתיחה:** אין (דוח אנליטי, לא פריט תוכן)

## 8. Brand SERP / Reputation SEO

- **קלט:** רשימת שאילתות ממותגות (`docs/08_BRAND_SERP_STRATEGY.md`) + מלאי תוכן קיים.
- **שלבים:** זיהוי אילו נכסים כבר קיימים → זיהוי חוסרים → הצעת נכסים חדשים לפי סדר עדיפות → לכל נכס: מעבר דרך תהליך 4 או 5 בהתאם לסוג.
- **פלט:** `data/output/audits/brand_serp_first_5_assets.md` (MVP2) ובהמשך פריטי תוכן נפרדים לכל נכס.
- **סטטוס פתיחה:** `Draft`

## 9. נתונים מובנים / Schema

- **קלט:** תוכן עמוד סופי (רק תוכן שכבר גלוי בעמוד – Schema לעולם לא "מקדים" תוכן שלא קיים).
- **שלבים:** בחירת סוג Schema מתאים → מילוי לפי `templates/schema_template.md` → הרצת `scripts/schema_generator.py` ליצירת JSON-LD → בדיקת התאמה מלאה בין ה-Schema לתוכן הגלוי (`agent/compliance_checker.md`, שלב 4).
- **פלט:** `data/output/schema/<page-slug>_schema.json`
- **סטטוס פתיחה:** `Draft`

## 10. אישור ובטיחות

- אינו תהליך יצירת תוכן, אלא שכבת בקרה שרצה על **כל** הפריטים מתהליכים 1, 4, 5, 6, 8, 9. ראו `agent/approval_rules.md` ו-`docs/09_APPROVAL_PROCESS.md` לפירוט המלא.
