import type { Metadata } from "next";
import { getSalesMethodContent } from "@/lib/content/loader";
import { SalesMethodExperience } from "@/components/sales-method/SalesMethodExperience";

export const metadata: Metadata = {
  title: "שיטת המכירה של Ecom | מכללת Ecom",
};

export default function SalesMethodPage() {
  const content = getSalesMethodContent();
  return <SalesMethodExperience content={content} />;
}
