import type { IntroStudentsContent } from "@/lib/content/schemas";

/**
 * Generic supporting human imagery (NOT real alumni or instructors), looked
 * up by placement id from content/site/ecom-intro/students.json. Renders
 * nothing until a real photo is added under that id - see StudentsContent.
 */
export function StudentPhoto({
  students,
  id,
  alt = "",
  className,
}: {
  students: IntroStudentsContent;
  id: string;
  alt?: string;
  className?: string;
}) {
  const photo = students.photos.find((p) => p.id === id);
  if (!photo) return null;
  // eslint-disable-next-line @next/next/no-img-element -- decorative cutout of unknown aspect ratio, absolutely positioned per-section
  return <img src={photo.photoSrc} alt={alt} className={className} loading="lazy" />;
}
