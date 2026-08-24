"use client";

import { Mail, Phone, User } from "lucide-react";
import type { ReactNode } from "react";
import type { LeadFormErrors } from "@/lib/validation";
import type { LeadFormValues, TrackingContext } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tone = "glass" | "solid" | "underline";

interface LeadFormFieldsProps {
  values: LeadFormValues;
  errors: LeadFormErrors;
  tracking: TrackingContext;
  onChange: (field: keyof LeadFormValues, value: string) => void;
  tone?: Tone;
  className?: string;
}

const TONE_INPUT: Record<Tone, string> = {
  // Placeholders on dark/transparent fields (glass, underline) use ink-300 —
  // muted enough to read as a placeholder, still clearly legible on mobile.
  // Never drop below that on a dark background (see globals.css note).
  glass:
    "rounded-xl border border-white/15 bg-white/[0.06] text-off-white placeholder:text-ink-300 focus:border-brand-400 focus:bg-white/10",
  solid:
    "rounded-xl border border-transparent bg-white text-ink-950 placeholder:text-ink-400 shadow-[0_1px_0_rgba(0,0,0,0.04)] focus:ring-2 focus:ring-brand-500",
  underline:
    "rounded-none border-0 border-b-2 border-white/25 bg-transparent px-1 text-off-white placeholder:text-ink-200 focus:border-brand-400",
};

const TONE_ICON: Record<Tone, string> = {
  glass: "text-ink-400",
  solid: "text-ink-400",
  underline: "text-ink-300",
};

const TONE_ERROR: Record<Tone, string> = {
  glass: "border-red-500/70 focus:border-red-500",
  solid: "ring-2 ring-red-500 focus:ring-red-500",
  underline: "border-red-400 focus:border-red-400",
};

/**
 * The actual `<input>` set + hidden tracking fields, shared by every lead
 * form on the page. `tone` changes how the fields are painted so each
 * section's surrounding composition (dark glass panel, solid card on a
 * gradient, minimal underline on a cinematic close) can differ while the
 * fields stay behaviorally identical.
 */
export function LeadFormFields({
  values,
  errors,
  tracking,
  onChange,
  tone = "glass",
  className,
}: LeadFormFieldsProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <input type="hidden" name="landingPageId" value={tracking.landingPageId} />
      <input type="hidden" name="pageUrl" value={tracking.pageUrl} />
      <input type="hidden" name="utm_source" value={tracking.utm_source ?? ""} />
      <input type="hidden" name="utm_medium" value={tracking.utm_medium ?? ""} />
      <input type="hidden" name="utm_campaign" value={tracking.utm_campaign ?? ""} />
      <input type="hidden" name="utm_content" value={tracking.utm_content ?? ""} />
      <input type="hidden" name="utm_term" value={tracking.utm_term ?? ""} />
      <input type="hidden" name="fbclid" value={tracking.fbclid ?? ""} />
      <input type="hidden" name="gclid" value={tracking.gclid ?? ""} />

      <Field
        id="fullName"
        tone={tone}
        icon={<User className="size-[18px]" aria-hidden />}
        placeholder="שם מלא"
        autoComplete="name"
        value={values.fullName}
        error={errors.fullName}
        onChange={(v) => onChange("fullName", v)}
      />
      <Field
        id="phone"
        tone={tone}
        type="tel"
        inputMode="tel"
        dir="ltr"
        icon={<Phone className="size-[18px]" aria-hidden />}
        placeholder="050-1234567"
        autoComplete="tel"
        value={values.phone}
        error={errors.phone}
        onChange={(v) => onChange("phone", v)}
      />
      <Field
        id="email"
        tone={tone}
        type="email"
        inputMode="email"
        dir="ltr"
        icon={<Mail className="size-[18px]" aria-hidden />}
        placeholder="example@mail.com"
        autoComplete="email"
        value={values.email}
        error={errors.email}
        onChange={(v) => onChange("email", v)}
      />
    </div>
  );
}

interface FieldProps {
  id: keyof LeadFormValues;
  tone: Tone;
  icon: ReactNode;
  placeholder: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "text" | "tel" | "email";
  dir?: "rtl" | "ltr";
  autoComplete?: string;
}

function Field({
  id,
  tone,
  icon,
  placeholder,
  value,
  error,
  onChange,
  type = "text",
  inputMode,
  dir,
  autoComplete,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <div className="relative">
        <span
          className={cn(
            "pointer-events-none absolute inset-y-0 start-3.5 flex items-center",
            TONE_ICON[tone],
          )}
        >
          {icon}
        </span>
        <input
          id={id}
          name={id}
          type={type}
          inputMode={inputMode}
          dir={dir}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          className={cn(
            "h-13 w-full py-3.5 ps-11 pe-4 text-base outline-none transition-colors",
            TONE_INPUT[tone],
            error && TONE_ERROR[tone],
          )}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}
