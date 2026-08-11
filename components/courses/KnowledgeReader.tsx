"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import type { Course, Topic } from "@/lib/types";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCourseProgress } from "@/lib/hooks/use-course-progress";
import { CourseThemeProvider } from "@/components/courses/CourseThemeProvider";
import { TopicNavigator } from "@/components/courses/TopicNavigator";
import { SalesTipCallout } from "@/components/courses/SalesTipCallout";
import { Breadcrumbs } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { FullScreenLoader } from "@/components/shared/FullScreenLoader";

export function KnowledgeReader({
  course,
  topic,
  renderedBody,
}: {
  course: Course;
  topic: Topic;
  renderedBody: ReactNode;
}) {
  const { user } = useAuth();
  const { progress, loading, markTopicComplete } = useCourseProgress(user?.id, course.meta.slug);
  const router = useRouter();

  if (!user || loading || !progress) {
    return <FullScreenLoader />;
  }

  const totalTopics = course.topics.length;
  const isLast = topic.index === totalTopics;
  const nextTopic = course.topics.find((t) => t.index === topic.index + 1);
  const prevTopic = course.topics.find((t) => t.index === topic.index - 1);
  const alreadyDone = progress.topicsCompleted.includes(topic.id);

  async function handleContinue() {
    await markTopicComplete(topic.id);
    if (nextTopic) {
      router.push(`/courses/${course.meta.slug}/playbook/${nextTopic.index}`);
    } else {
      router.push(`/courses/${course.meta.slug}/video`);
    }
  }

  return (
    <CourseThemeProvider theme={course.theme}>
      <div className="flex flex-col gap-6 pb-16">
        <Breadcrumbs
          items={[
            { label: "בית", href: "/" },
            { label: "הקורסים", href: "/courses" },
            { label: course.meta.title, href: `/courses/${course.meta.slug}` },
            { label: `נושא ${topic.index}` },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Playbook - {course.meta.title}
              </div>
              <TopicNavigator
                courseSlug={course.meta.slug}
                topics={course.topics}
                currentIndex={topic.index}
                completedTopicIds={progress.topicsCompleted}
              />
            </div>
          </aside>

          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-[var(--course-text-accent)]">
                <span>נושא {topic.index} מתוך {totalTopics}</span>
                {alreadyDone && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="size-3.5" />
                    הושלם
                  </span>
                )}
              </div>
              <h1 className="mb-6 text-2xl font-bold text-slate-900 sm:text-3xl">{topic.title}</h1>

              <article className="prose prose-slate prose-sm sm:prose-base max-w-none prose-headings:font-bold prose-a:text-[var(--course-text-accent)]">
                {renderedBody}
              </article>

              {topic.keyPoints.length > 0 && (
                <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">עיקרי הדברים</h3>
                  <ul className="flex flex-col gap-2">
                    {topic.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--course-primary)]" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-4">
                {topic.salesTip && <SalesTipCallout variant="sales-tip">{topic.salesTip}</SalesTipCallout>}
                {topic.customerExplain && (
                  <SalesTipCallout variant="customer-explain">{topic.customerExplain}</SalesTipCallout>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              {prevTopic ? (
                <Button asChild variant="outline">
                  <Link href={`/courses/${course.meta.slug}/playbook/${prevTopic.index}`}>
                    <ArrowRight className="size-4" />
                    נושא קודם
                  </Link>
                </Button>
              ) : (
                <span />
              )}
              <Button onClick={handleContinue} size="lg">
                {isLast ? "השלמתי - למעבר לסרטון של עוז" : "השלמתי - לנושא הבא"}
                <ArrowLeft className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </CourseThemeProvider>
  );
}
