import type { Metadata } from "next";
import { getComingSoonPage } from "@/lib/content/loader";
import { DEFAULT_ICON, ICON_MAP } from "@/lib/icon-map";
import { PageHeader } from "@/components/shared/PageHeader";
import { ComingSoonState } from "@/components/shared/ComingSoonState";

export const metadata: Metadata = {
  title: "סימולציות AI | אקדמיית איקום",
};

export default function SimulationsPage() {
  const content = getComingSoonPage("simulations");
  const Icon = ICON_MAP[content.icon] ?? DEFAULT_ICON;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <PageHeader crumbs={[{ label: "בית", href: "/" }, { label: content.title }]} title={content.title} />
      <ComingSoonState
        icon={Icon}
        title={content.title}
        description={content.description}
        upcoming={content.upcoming}
      />
    </div>
  );
}
