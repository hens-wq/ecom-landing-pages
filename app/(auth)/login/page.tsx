import type { Metadata } from "next";
import { GraduationCap, ShieldCheck, BrainCircuit, Code2, PenTool, TrendingUp } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { ThemedAccentBackground } from "@/components/shared/GeometricDecor";

export const metadata: Metadata = {
  title: "התחברות | אקדמיית איקום",
};

const COURSE_ICONS = [ShieldCheck, BrainCircuit, Code2, PenTool, TrendingUp];

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-[var(--brand-purple)] to-[#3b1573] lg:flex">
        <ThemedAccentBackground wedgeCorner="bottom-left" className="opacity-60" />
        <div className="relative z-10 flex flex-1 flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <GraduationCap className="size-5" />
            </div>
            <span className="text-lg font-bold">אקדמיית איקום</span>
          </div>

          <div className="flex flex-col gap-5">
            <h2 className="max-w-md text-3xl font-bold leading-tight">
              ממכירה של קורס, לייצוג אמיתי של עולם שלם
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-white/70">
              מערכת ההכשרה הפנימית שתלווה אתכם מהיום הראשון - להכיר את איקום, להבין את הקורסים,
              וללמוד למכור אותם בביטחון.
            </p>
            <div className="mt-2 flex items-center gap-3">
              {COURSE_ICONS.map((Icon, i) => (
                <div
                  key={i}
                  className="flex size-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm"
                >
                  <Icon className="size-5" />
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/40">מערכת פנימית לנציגי מכירות · ECOM Academy</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
        <LoginForm />
      </div>
    </div>
  );
}
