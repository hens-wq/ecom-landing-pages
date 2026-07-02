# כלים זמינים לסוכן ומגבלותיהם

מסמך זה מתעד בכנות מה הסוכן **יכול** לעשות בפועל בסביבת העבודה הנוכחית, ומה **לא** זמין עדיין.

## זמין כעת

| כלי | שימוש |
|---|---|
| קריאה/כתיבה של קבצים מקומיים | כל התוכן תחת `/ecom-seo-agent` – docs, agent, templates, data, scripts |
| הרצת סקריפטי Python (`/scripts`) | עיבוד קבצי CSV שהוזנו ידנית (GSC, GA, מלאי תוכן) |
| Git | ניהול גרסאות של הפרויקט עצמו (לא של אתר הוורדפרס) |

## לא זמין כעת (ומתי יהפוך לזמין)

| כלי | סטטוס | מתי מתחברים |
|---|---|---|
| WordPress REST API | לא מחובר | רק כשהמשתמש יספק Application Password / API credentials ויאשר חיבור במפורש |
| Google Search Console API | לא מחובר | רק כשהמשתמש יספק הרשאות/OAuth ויאשר במפורש. בינתיים: ייצוא CSV ידני |
| Google Analytics API | לא מחובר | כנ"ל |
| Google Sheets API | לא מחובר | כנ"ל |
| גישת רשת חיה ל-ecomschool.co.il מתוך סביבת עבודה זו | חסומה במדיניות ארגונית של סביבת ההרצה הנוכחית | תלוי בסביבת הרצה – ייתכן שזמין בסביבות אחרות, או דרך ייצוא/הדבקה ידנית |
| כלי מחקר מתחרים אוטומטי (scraping) | לא בשימוש – גם כשתהיה גישת רשת, לא לבצע scraping שמפר את תנאי השימוש של גוגל | מחקר מתחרים ידני/מבוסס תוכן שסופק |
| נתוני Core Web Vitals / PageSpeed | אין מקור נתונים כרגע | כאשר יסופק דוח PageSpeed Insights / CrUX (ידני או CSV) – ראו `docs/10_TECHNICAL_SEO_WORKFLOW.md`, בדיקה #16 |

## עקרון עבודה כשכלי חסר

כאשר משימה דורשת כלי שאינו זמין: 1) לציין זאת בבירור למשתמש, 2) להציע חלופה מעשית (ייצוא ידני, הדבקת תוכן, בקשת הרשאות), 3) להמשיך עם כל חלק מהמשימה שכן ניתן לבצע ללא הכלי החסר, ולסמן בבירור מה נותר פתוח.

## סקריפטים זמינים (`/scripts`)

| סקריפט | תפקיד |
|---|---|
| `content_inventory_parser.py` | הפקת טבלת מלאי תוכן מובנית מקובץ CSV של סריקת אתר. תומך גם בפורמט crawler מורחב (status_code, indexability, canonical, robots_meta, h1_count) לפי `docs/11_CRAWLER_EXPORT_GUIDE.md`, ומוסיף ממצאי SEO טכני (`docs/10_TECHNICAL_SEO_WORKFLOW.md`) לצד טבלת המלאי |
| `search_console_analyzer.py` | ניתוח ייצוא GSC – CTR נמוך, עמודים קרובים לעמוד 1, קניבליזציה |
| `internal_link_mapper.py` | הצעת קישורים פנימיים בין עמודי קורס למאמרי בלוג לפי נושא/מילת מפתח |
| `metadata_auditor.py` | בדיקת כותרות ו-meta descriptions – אורך, כפילויות, שדות חסרים |
| `schema_generator.py` | יצירת JSON-LD ל-Organization / Course / FAQPage / BreadcrumbList / Article |

הוראות הרצה מלאות: `scripts/README.md`. הוראות ייצוא נתוני crawler: `docs/11_CRAWLER_EXPORT_GUIDE.md`.
