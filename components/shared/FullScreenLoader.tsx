export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--brand-purple)]" />
        <span className="text-sm text-slate-400">טוען...</span>
      </div>
    </div>
  );
}
