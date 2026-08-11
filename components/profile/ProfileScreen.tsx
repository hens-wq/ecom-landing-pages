"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, RotateCcw, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { authRepository } from "@/lib/repositories/auth.repository";
import { progressRepository } from "@/lib/repositories/progress.repository";
import { newUserSeed, partialUserSeed, nearlyDoneUserSeed } from "@/lib/seed/seed-progress";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FullScreenLoader } from "@/components/shared/FullScreenLoader";

const DEMO_PRESETS = [
  { id: "new", label: "משתמש חדש", seed: newUserSeed },
  { id: "partial", label: "התקדמות חלקית", seed: partialUserSeed },
  { id: "nearly", label: "כמעט סיימתי", seed: nearlyDoneUserSeed },
] as const;

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("");
}

export function ProfileScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (loading || !user) {
    return <FullScreenLoader />;
  }

  async function handleLogout() {
    await authRepository.logout();
    router.replace("/login");
  }

  async function handleSeed(seed: () => ReturnType<typeof newUserSeed>) {
    setBusy(true);
    await progressRepository.seedProgress(user!.id, seed());
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <PageHeader crumbs={[{ label: "בית", href: "/" }, { label: "פרופיל / הגדרות" }]} title="פרופיל / הגדרות" />

      <Card>
        <CardHeader>
          <CardTitle>פרטים אישיים</CardTitle>
          <CardDescription>הפרטים שלכם במערכת ההכשרה</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="text-lg">{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-slate-900">{user.name}</span>
              <span className="text-sm text-slate-500">{user.role}</span>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">אימייל</span>
              <span className="text-sm text-slate-700">{user.email}</span>
            </div>
            {user.startDate && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">תאריך הצטרפות</span>
                <span className="text-sm text-slate-700">{user.startDate}</span>
              </div>
            )}
          </div>
          <div>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="size-4" />
              התנתקות
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="size-4 text-slate-400" />
            כלי הדגמה
          </CardTitle>
          <CardDescription>
            אפשרות לאפס או לדמות מצבי התקדמות שונים - שימושי לבדיקת המערכת בלבד.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2.5">
          {DEMO_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              variant="outline"
              disabled={busy}
              onClick={() => handleSeed(preset.seed)}
            >
              <Sparkles className="size-4" />
              {preset.label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
