import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { hasValidSession } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/token";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "כניסה | Ecom",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = safeNextPath(next);
  if (await hasValidSession()) redirect(target);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-slate-900">כניסה למערכת</h1>
        <p className="mt-1 text-sm text-slate-600">הנתונים זמינים רק לצוות. הזינו את סיסמת הצוות כדי להמשיך.</p>
      </div>
      <LoginForm next={target} />
    </main>
  );
}
