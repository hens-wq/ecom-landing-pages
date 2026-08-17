"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn, Sparkles } from "lucide-react";
import { authRepository } from "@/lib/repositories/auth.repository";
import { progressRepository } from "@/lib/repositories/progress.repository";
import { MOCK_USER } from "@/lib/seed/mock-user";
import { newUserSeed, partialUserSeed, nearlyDoneUserSeed } from "@/lib/seed/seed-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

const DEMO_PRESETS = [
  { id: "new", label: "משתמש חדש", seed: newUserSeed },
  { id: "partial", label: "התקדמות חלקית", seed: partialUserSeed },
  { id: "nearly", label: "כמעט סיימתי", seed: nearlyDoneUserSeed },
] as const;

/**
 * New reps see the branded "who is Ecom" opening experience once, right
 * after login, before the dashboard/training flow - see
 * components/ecom-intro/EcomIntroScreen.tsx, which marks it complete.
 */
async function postLoginDestination(userId: string): Promise<string> {
  const progress = await progressRepository.getOverallProgress(userId);
  return progress.introCompleted ? "/" : "/ecom-intro";
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState(MOCK_USER.email);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotClicked, setForgotClicked] = useState(false);

  useEffect(() => {
    authRepository.getCurrentUser().then(async (user) => {
      if (user) router.replace(await postLoginDestination(user.id));
    });
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await authRepository.login(email, password);
      router.push(await postLoginDestination(user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה בהתחברות");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin(seed: () => ReturnType<typeof newUserSeed>) {
    setLoading(true);
    try {
      const user = await authRepository.login(MOCK_USER.email, "demo");
      await progressRepository.seedProgress(user.id, seed());
      router.push(await postLoginDestination(user.id));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold text-slate-900">התחברות למערכת ההכשרה</h1>
        <p className="text-sm text-slate-500">שמחים שהצטרפת לאיקום - בואו נתחיל את המסע שלך.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">אימייל</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@ecomcollege.co.il"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">סיסמה</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="pl-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
              aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
            זכור אותי
          </label>
          <button
            type="button"
            onClick={() => setForgotClicked(true)}
            className="text-sm font-medium text-[var(--brand-purple)] hover:underline"
          >
            שכחתי סיסמה
          </button>
        </div>

        {forgotClicked && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            שחזור סיסמה יהיה זמין כאן בהמשך, לאחר חיבור מערכת ההזדהות האמיתית.
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
          <LogIn className="size-4" />
          התחברות
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-slate-400">התחברות מהירה להדגמה</span>
        <Separator className="flex-1" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {DEMO_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={loading}
            onClick={() => handleDemoLogin(preset.seed)}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 px-2 py-3 text-center text-xs font-medium text-slate-600 transition-colors hover:border-[var(--brand-purple)] hover:bg-[var(--brand-purple)]/5 hover:text-[var(--brand-purple)]"
          >
            <Sparkles className="size-3.5" />
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
