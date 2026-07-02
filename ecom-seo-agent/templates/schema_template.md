# תבנית נתונים מובנים / Schema (JSON-LD)

> כלל ברזל: כל שדה ב-Schema חייב להתאים לתוכן **גלוי בפועל** בעמוד. אין להוסיף Schema שמתאר מידע שלא מופיע למשתמש. ראו `agent/compliance_checker.md`, שלב 4. הפקה בפועל דרך `scripts/schema_generator.py`.

## Organization

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "מכללת איקום",
  "alternateName": "Ecom School",
  "url": "https://www.ecomschool.co.il/",
  "logo": "<URL ללוגו בפועל>",
  "sameAs": [
    "<פרופילים חברתיים/חיצוניים מאומתים בלבד>"
  ]
}
```

## EducationalOrganization

```json
{
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "name": "מכללת איקום",
  "url": "https://www.ecomschool.co.il/",
  "description": "<תיאור תמציתי התואם את תוכן עמוד ה'אודות' בפועל>"
}
```

## Course (לדפי קורס)

```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "<שם הקורס בדיוק כפי שמופיע בעמוד>",
  "description": "<תיאור תואם לתוכן הגלוי>",
  "provider": {
    "@type": "Organization",
    "name": "מכללת איקום",
    "sameAs": "https://www.ecomschool.co.il/"
  }
}
```
**הערה:** אין להוסיף `hasCourseInstance`, מחיר, או משך קורס אלא אם מופיעים בבירור בעמוד עצמו.

## BreadcrumbList

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "בית", "item": "https://www.ecomschool.co.il/"},
    {"@type": "ListItem", "position": 2, "name": "<קטגוריה>", "item": "<URL>"},
    {"@type": "ListItem", "position": 3, "name": "<כותרת העמוד>", "item": "<URL העמוד הנוכחי>"}
  ]
}
```

## Article (למאמרי בלוג)

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "<כותרת המאמר>",
  "description": "<meta description>",
  "author": {"@type": "Organization", "name": "מכללת איקום"},
  "publisher": {"@type": "Organization", "name": "מכללת איקום"},
  "datePublished": "<YYYY-MM-DD>",
  "dateModified": "<YYYY-MM-DD>"
}
```

## FAQPage (רק אם קיים בלוק FAQ גלוי בעמוד, בדיוק באותה נוסחה)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "<השאלה בדיוק כפי שמופיעה בעמוד>",
      "acceptedAnswer": {"@type": "Answer", "text": "<התשובה בדיוק כפי שמופיעה בעמוד>"}
    }
  ]
}
```

## LocalBusiness

**להשתמש רק אם רלוונטי בפועל** (למשל אם קיים סניף/כתובת פיזית שרוצים להציג ב-Google). לא לשימוש כברירת מחדל למכללה שפועלת בעיקר אונליין.

## Review

**להשתמש רק אם קיימות ביקורות אמיתיות, גלויות בעמוד, עם דירוג נראה לעין.** אין ליצור Review schema על בסיס נתונים שלא מוצגים למשתמש בעמוד עצמו. ראו איסור "ביקורות מזויפות" ב-`docs/02_SEO_RULES_AND_COMPLIANCE.md`.
