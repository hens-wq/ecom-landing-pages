import type { Metadata } from "next";
import { getEcomIntroContent } from "@/lib/content/loader";
import { EcomIntroScreen } from "@/components/ecom-intro/EcomIntroScreen";

export const metadata: Metadata = {
  title: "מי זאת Ecom | מכללת Ecom",
};

export default function EcomIntroPage() {
  const content = getEcomIntroContent();
  return <EcomIntroScreen content={content} />;
}
