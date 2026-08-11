import { DEFAULT_ICON, ICON_MAP } from "@/lib/icon-map";

export function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  const Icon = ICON_MAP[icon] ?? DEFAULT_ICON;
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white px-5 py-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-purple)]/10 text-[var(--brand-purple)]">
        <Icon className="size-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold text-slate-900">{value}</span>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
    </div>
  );
}
