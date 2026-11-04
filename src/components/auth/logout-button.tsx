"use client";

import { useRouter } from "next/navigation";

/** Ends the session on this browser and returns to the sign-in page. */
export function LogoutButton() {
  const router = useRouter();

  async function onClick(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-3 mb-2 rounded-md px-3 py-1.5 text-start text-xs text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
    >
      יציאה מהמערכת
    </button>
  );
}
