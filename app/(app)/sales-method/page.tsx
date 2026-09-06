import type { Metadata } from "next";
import { getSalesMethodContent } from "@/lib/content/loader";
import { SalesMethodScreen } from "@/components/sales-method/SalesMethodScreen";

export const metadata: Metadata = {
  title: "שיטת המכירה של Ecom | מכללת Ecom",
};

export default function SalesMethodPage() {
  const content = getSalesMethodContent();
  return <SalesMethodScreen content={content} />;
}
