# אקדמיית איקום - מערכת הכשרת נציגי מכירות

מערכת למידה והכשרה פנימית לנציגי מכירות חדשים של ECOM College. המערכת לוקחת נציג/ה חדש/ה
מכמעט אפס ידע ועד להבנה מלאה של איקום, הקורסים שהיא מוכרת, ואיך למכור אותם בשיחה אמיתית.

זו **לא** מערכת LMS לסטודנטים. זו מערכת פנימית לצוות המכירות.

---

## התקנה והרצה

```bash
npm install
npm run dev
```

האתר יעלה בכתובת [http://localhost:3000](http://localhost:3000).

התחברות היא מוקית (Mock) - כל אימייל וסיסמה מתקבלים. במסך ההתחברות יש גם שלושה כפתורי
"התחברות מהירה להדגמה" שמדמים משתמש חדש / בהתקדמות חלקית / כמעט סיים - שימושי לבדיקת המערכת
במצבי התקדמות שונים בלי לעבור ידנית על כל השלבים.

```bash
npm run build   # בדיקת build לפרודקשן
npm run lint    # ESLint
```

---

## סטאק טכנולוגי

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4** (קונפיגורציה מבוססת CSS, ללא `tailwind.config.js`)
- **shadcn/ui pattern** - קומפוננטות Radix UI + CVA שנכתבו ידנית תחת `components/ui`
- **Lucide Icons**
- **Framer Motion** (מותקן, לשימוש עתידי עבור אנימציות עדינות נוספות)
- **MDX** (`next-mdx-remote` + `gray-matter`) לתוכן הלמידה הארוך (ה-Playbooks)
- **Zod** לוולידציה של קבצי תוכן
- **Heebo** + RTL מלא

אין backend אמיתי. אימות והתקדמות נשמרים ב-`localStorage` דרך שכבת Repository (ראו למטה) -
כך שבעתיד אפשר להחליף אותם במימוש מול שרת בלי לגעת ב-UI.

---

## מבנה התיקיות

```
app/                          נתיבי Next.js (App Router)
  (auth)/login/                מסך התחברות - ללא ה-shell הראשי
  (app)/                       כל שאר האתר, עטוף ב-AppShell (סיידבר + טופבר + הגנת התחברות)
    page.tsx                   דשבורד ("/")
    about-ecom/                מי זאת איקום
    training-path/             מסלול ההכשרה שלי
    courses/                   הקורסים (hub)
      [slug]/                  עמוד קורס בודד
        playbook/[topic]/      קורא ה-Playbook (נושא 1/2/3)
        video/                 סרטון עוז
        quiz/                  מבחן ידע
        complete/              מסך סיום קורס
    customer-profile/          פרופיל לקוח (Coming soon)
    sales-method/               שיטת המכירה (Coming soon)
    simulations/                סימולציות AI (Coming soon)
    profile/                    פרופיל / הגדרות

content/                      **כל התוכן שמוצג למשתמש. ראו CONTENT_GUIDE.md**
  site/                        תוכן כללי של האתר (ניווט, בית, מי זאת איקום, מסלול הכשרה...)
  courses/<slug>/               meta / theme / overview / video / quiz + topics/*.mdx לכל קורס

components/
  ui/                          קומפוננטות בסיס (button, card, badge, progress, tabs...)
  layout/                      AppShell, AppSidebar, Topbar, MobileNav
  shared/                      קומפוננטות משותפות לכל האתר (PageHeader, EmptyState, וכו')
  courses/                     קומפוננטות ספציפיות לעולם הקורסים (CourseCard, QuizEngine...)
  training/                    TrainingPathStepper ורכיבי מסלול ההכשרה
  about/, auth/, dashboard/, profile/   מסכים ייעודיים

lib/
  types.ts                     מודלים מרכזיים (User, Course, Quiz, Progress...)
  content/schemas.ts            סכמות Zod - כל קובץ JSON/MDX מאומת מולן
  content/loader.ts             קריאת קבצי /content מהדיסק (Server-side בלבד)
  repositories/                 auth.repository.ts, progress.repository.ts - שכבת גישה יחידה ל-localStorage
  hooks/                        hooks של React שמחברים בין תוכן (מהשרת) להתקדמות (מהלקוח)
  seed/                         משתמש דמו + פריסטים של התקדמות לבדיקות
```

---

## איך זה עובד: תוכן מול קוד

העיקרון המרכזי בפרויקט: **תוכן לא נמצא בתוך קומפוננטות React**.

```
CONTENT (JSON / MDX)  →  DATA MODEL (Zod + TypeScript)  →  קומפוננטות גנריות  →  UI
```

כל טקסט שמופיע למשתמש - כותרות, פסקאות, שאלות מבחן, טקסטים של עוז, שמות קורסים - נמצא
תחת `/content` ולא בתוך קובצי `.tsx`. עריכת תוכן לא דורשת ידע בתכנות. ראו את **CONTENT_GUIDE.md**
למדריך מפורט למי שלא מפתח/ת.

כל קובץ תוכן נבדק מול סכמת Zod (`lib/content/schemas.ts`) בזמן טעינה. אם שדה חובה חסר או
מהצורה הלא נכונה, האתר יזרוק שגיאה ברורה שמצביעה בדיוק על שם הקובץ הבעייתי - במקום להיכשל
בשקט או להציג עמוד שבור.

---

## מערכת העיצוב של הקורסים (Course Theming)

לכל אחד מחמשת הקורסים יש זהות ויזואלית נגזרת מעיצוב הכריכה שלו:

| קורס | צבע | Slug |
|---|---|---|
| Cyber | כחול | `cyber` |
| AI | טורקיז/אקווה | `ai` |
| Full Stack | סגול | `fullstack` |
| UX/UI | ורוד | `ux-ui` |
| Digital Marketing & Data | ירוק | `digital-marketing` |

הצבעים מוגדרים בקובץ `content/courses/<slug>/theme.json` (ראו CONTENT_GUIDE.md) ומוזרקים
כמשתני CSS (`--course-primary`, `--course-secondary`, `--course-soft`, `--course-border`,
`--course-glow`, `--course-text-accent`) על ידי `CourseThemeProvider`. כל קומפוננטה שקשורה
לקורס (Hero, כפתורים, פרוגרס, badges, אייקונים, דקורציות גיאומטריות) משתמשת במשתנים האלה
במקום בצבע קבוע - כך שכל הקומפוננטות זהות בין הקורסים, ורק הצבע משתנה.

צבעי המותג הכלליים של איקום (`--brand-purple`, `--brand-teal`, `--brand-green`) מוגדרים ב-
`app/globals.css` ומשמשים במסכים הכלליים (דשבורד, התחברות, אזורי "בקרוב").

---

## מערכת התקדמות (Progress)

ההתקדמות של המשתמש נשמרת מקומית ב-`localStorage`, אך אף קומפוננטה לא ניגשת אליו ישירות.
כל הגישה עוברת דרך:

- `lib/repositories/auth.repository.ts` - התחברות/התנתקות/משתמש נוכחי
- `lib/repositories/progress.repository.ts` - התקדמות בכל קורס (נושאים שהושלמו, האם נצפה
  הסרטון, ניסיונות מבחן, ציון הכי גבוה, השלמת קורס) + התקדמות כללית (השלמת "מי זאת איקום")

שני הקבצים חושפים **interface** (`AuthRepository`, `ProgressRepository`) עם מימוש יחיד כרגע
(`LocalAuthRepository`, `LocalProgressRepository`). כשיהיה backend אמיתי, אפשר לכתוב
`ApiAuthRepository` / `DatabaseProgressRepository` שמממשים את אותו interface, ולהחליף רק את
שורת ה-`export const ... = new ...` - שום קומפוננטת UI לא צריכה להשתנות.

קומפוננטות React ניגשות להתקדמות דרך hooks תחת `lib/hooks/` (`useAuth`, `useCourseProgress`,
`useOverallProgress`, `useAllCourseProgress`) שעוטפים את ה-repositories.

---

## מבחן הידע (Quiz Engine)

מנוע גנרי (`components/courses/QuizEngine.tsx` + `QuizQuestion` / `QuizProgress` / `QuizResult`)
שמקבל אובייקט `Quiz` בלבד (כותרת, ציון עובר, מערך שאלות) ומריץ שאלה-אחר-שאלה, בחירה יחידה,
פס התקדמות, ובסיום - ציון, עבר/נכשל, וסקירת תשובות עם הסבר לכל שאלה. שום שאלה לא כתובה בתוך
קוד ה-UI - הכל מגיע מ-`content/courses/<slug>/quiz.json`.

---

## מה מוקי (Mocked) כרגע

- **אימות**: כל אימייל/סיסמה מתקבלים, אין בדיקה מול שרת.
- **התקדמות**: נשמרת ב-`localStorage` בלבד (לא משותפת בין דפדפנים/מכשירים).
- **וידאו**: כתובות ה-URL בקבצי `video.json` הן placeholder (`example.com`) - הנגן מזהה זאת
  ומציג מסך "הסרטון יתווסף כאן בקרוב" ממותג בצבעי הקורס, במקום נגן וידאו שבור. ברגע שיוזן URL
  אמיתי, הנגן יעבוד כרגיל.
- **משתמש**: משתמש דמו יחיד (דניאל כהן, נציג מכירות) עם שלושה פריסטים של התקדמות לבדיקה.

## מה מוכן לאינטגרציה עתידית

- שכבת ה-Repository מאפשרת החלפת האחסון המקומי ב-API/DB בלי refactor ל-UI.
- מודלים ב-`lib/types.ts` כבר כוללים את כל השדות שיידרשו (ציונים, ניסיונות, תאריכי השלמה).
- הניווט, הראוטים והפלייסהולדרים של "פרופיל לקוח", "שיטת המכירה" ו"סימולציות AI" כבר קיימים
  ומוכנים לקבל תוכן אמיתי כשהוא יהיה מוכן - כולל route params ומבנה תיאורטי.
- תוכן ה-Playbook כתוב ב-MDX כך שאפשר להוסיף בעתיד רכיבי React מותאמים אישית בתוך התוכן
  עצמו (טבלאות, אזהרות, אינטראקציות) בלי לשנות את מנוע הקריאה.

---

## תיעוד נוסף

- **CONTENT_GUIDE.md** - מדריך עריכת תוכן בשפה פשוטה, ללא צורך בידע בתכנות.
