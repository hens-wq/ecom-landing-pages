import { DEFAULT_ICON, ICON_MAP } from "@/lib/icon-map";

export function ValueCards({
  items,
}: {
  items: { icon: string; title: string; description: string }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => {
        const Icon = ICON_MAP[item.icon] ?? DEFAULT_ICON;
        return (
          <div
            key={`${item.title}-${i}`}
            className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--course-soft,#f1e9fe)] text-[var(--course-text-accent,var(--brand-purple))]">
              <Icon className="size-5" />
            </div>
            <h3 className="font-semibold text-slate-900">{item.title}</h3>
            <p className="text-sm leading-relaxed text-slate-500">{item.description}</p>
          </div>
        );
      })}
    </div>
  );
}
