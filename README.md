# לוח בקרה שיווקי - Ecom (Phase 1)

דשבורד פנימי לניתוח ביצועי שיווק עבור מכללת Ecom. Phase 1 כולל UI מלא, ארכיטקטורת נתונים ונתוני דמו - ללא חיבור בפועל ל-Meta Ads, Google Sheets, Pixel/CAPI או CRM.

## הרצה מקומית

```bash
npm install
npm run dev
```

פתחו [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # build לפרודקשן
npm run start   # הרצת ה-build
npm run lint    # ESLint
npx tsc --noEmit  # בדיקת טיפוסים
```

## מבנה הפרויקט

- `src/app` - שלושת המסכים: דשבורד (`/`), מכירות והתאמות (`/sales-matching`), חיבורים (`/integrations`)
- `src/components/ui` - רכיבי shadcn/ui (נכתבו ידנית, ללא CLI, עקב חסימת רשת ל-ui.shadcn.com)
- `src/components/dashboard`, `sales-matching`, `integrations`, `layout`, `shared` - רכיבי מסך
- `src/lib/types.ts` - טיפוסי הליבה: Campaign / AdSet / Ad / Lead / Sale / SalesMatch / PerformanceMetrics
- `src/lib/calculations.ts` - נוסחאות (CPL, CTR, CPC, CPM, Close Rate, Cost per Sale, ROAS, Time to Sale) עם חלוקה בטוחה (אף פעם לא Infinity/NaN)
- `src/lib/phone.ts` + `src/lib/matching.ts` - נרמול טלפון ישראלי והתאמת מכירות ללידים, מופרדים לגמרי מה-UI
- `src/lib/mock-data` - כל נתוני הדמו (קמפיינים, לידים, מכירות, מגמה יומית)

ראו את סיכום השיחה למידע מלא על החלטות ארכיטקטורה ומה מתוכנן ל-Phase 2.
