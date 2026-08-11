import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getCourseOrNotFound } from "@/lib/get-course-or-404";
import { KnowledgeReader } from "@/components/courses/KnowledgeReader";
import { topicMdxComponents } from "@/components/courses/mdx";

interface RouteParams {
  slug: string;
  topic: string;
}

function resolveTopic(course: ReturnType<typeof getCourseOrNotFound>, topicParam: string) {
  const index = Number(topicParam);
  const topic = course.topics.find((t) => t.index === index);
  if (!topic) notFound();
  return topic;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug, topic: topicParam } = await params;
  const course = getCourseOrNotFound(slug);
  const topic = resolveTopic(course, topicParam);
  return { title: `${topic.title} | ${course.meta.title} | אקדמיית איקום` };
}

export default async function PlaybookTopicPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug, topic: topicParam } = await params;
  const course = getCourseOrNotFound(slug);
  const topic = resolveTopic(course, topicParam);

  return (
    <KnowledgeReader
      course={course}
      topic={topic}
      renderedBody={<MDXRemote source={topic.content} components={topicMdxComponents} />}
    />
  );
}
