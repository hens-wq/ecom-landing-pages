import type { Metadata } from "next";
import { getTrainingPathContent } from "@/lib/content/loader";
import { TrainingPathScreen } from "@/components/training/TrainingPathScreen";

export const metadata: Metadata = {
  title: "מסלול ההכשרה שלי | אקדמיית איקום",
};

export default function TrainingPathPage() {
  const content = getTrainingPathContent();
  return <TrainingPathScreen content={content} />;
}
