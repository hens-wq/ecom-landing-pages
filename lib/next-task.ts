import type { CourseMeta, CourseProgress, CourseSlug, OverallTrainingProgress } from "@/lib/types";

export interface NextTask {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  icon: string;
}

/**
 * Decides the single "obvious next action" for the dashboard's continue
 * learning card, based on the roadmap order: about ECOM -> courses (topics ->
 * video -> quiz), in course display order -> everything beyond that is
 * coming soon.
 */
export function computeNextTask(params: {
  overall: OverallTrainingProgress;
  courseMetas: CourseMeta[];
  courseProgresses: Record<CourseSlug, CourseProgress>;
}): NextTask {
  const { overall, courseMetas, courseProgresses } = params;

  if (!overall.aboutEcomCompleted) {
    return {
      title: "היכרות עם Ecom",
      description: "הכירו את מכללת Ecom, החוזקות, החיבור לתעשייה והאנשים שמאחורי המספרים",
      href: "/ecom-intro",
      ctaLabel: "מתחילים את ההיכרות",
      icon: "Building2",
    };
  }

  const nextCourseMeta = courseMetas.find((c) => !courseProgresses[c.slug]?.completed);

  if (nextCourseMeta) {
    const cp = courseProgresses[nextCourseMeta.slug];

    if (!cp || cp.topicsCompleted.length === 0) {
      return {
        title: `היכרות עם ${nextCourseMeta.title}`,
        description: `בואו נתחיל ללמוד את חומרי הלמידה של קורס ${nextCourseMeta.title}.`,
        href: `/courses/${nextCourseMeta.slug}`,
        ctaLabel: "התחל את הקורס",
        icon: nextCourseMeta.icon,
      };
    }
    if (cp.topicsCompleted.length < 3) {
      return {
        title: `להמשיך את חומרי הלמידה - ${nextCourseMeta.title}`,
        description: "עוד כמה נושאים ותסיימו את חומר הרקע המקצועי של הקורס.",
        href: `/courses/${nextCourseMeta.slug}`,
        ctaLabel: "המשך ללמוד",
        icon: nextCourseMeta.icon,
      };
    }
    if (!cp.videoWatched) {
      return {
        title: `סרטון עוז - ${nextCourseMeta.title}`,
        description: "עוז מחכה להסביר איך למכור את הקורס הזה נכון.",
        href: `/courses/${nextCourseMeta.slug}/video`,
        ctaLabel: "צפו בסרטון",
        icon: "Video",
      };
    }
    return {
      title: `מבחן ידע - ${nextCourseMeta.title}`,
      description: "הגיע הזמן לבדוק את הידע שרכשתם על הקורס.",
      href: `/courses/${nextCourseMeta.slug}/quiz`,
      ctaLabel: "עבור למבחן הידע",
      icon: "ClipboardCheck",
    };
  }

  if (!overall.salesMethodCompleted) {
    return {
      title: "שיטת המכירה של Ecom",
      description: "אפיון לקוח, התאמת מסלול וניהול שיחת מכירה - המודול המסכם של ההכשרה.",
      href: "/sales-method",
      ctaLabel: "להתחיל את המודול",
      icon: "Target",
    };
  }

  return {
    title: "סיימתם את ההכשרה!",
    description: "כל הכבוד - השלמתם את כל שלבי ההכשרה. סימולציות AI ייפתחו בקרוב.",
    href: "/",
    ctaLabel: "חזרה לדף הראשי",
    icon: "PartyPopper",
  };
}
