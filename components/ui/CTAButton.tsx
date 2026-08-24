"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "outline-dark" | "ghost";
type Size = "md" | "lg";

interface BaseProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: boolean;
  fullWidth?: boolean;
  className?: string;
}

interface ButtonAsButton extends BaseProps {
  href?: undefined;
  type?: "button" | "submit";
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

interface ButtonAsLink extends BaseProps {
  href: string;
  type?: undefined;
  loading?: undefined;
  disabled?: undefined;
  onClick?: () => void;
}

type CTAButtonProps = ButtonAsButton | ButtonAsLink;

const VARIANT_STYLES: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white shadow-[0_8px_30px_-8px_rgba(140,82,255,0.65)] hover:bg-brand-400 active:bg-brand-600",
  secondary:
    "bg-off-white text-ink-950 hover:bg-white active:bg-ink-100",
  outline:
    "border border-white/25 text-white hover:border-white/50 hover:bg-white/5 active:bg-white/10",
  "outline-dark":
    "border border-ink-300 text-ink-950 hover:border-ink-400 hover:bg-ink-950/5 active:bg-ink-950/10",
  ghost: "text-white hover:bg-white/10 active:bg-white/15",
};

const SIZE_STYLES: Record<Size, string> = {
  md: "h-12 px-6 text-[15px]",
  lg: "h-14 px-8 text-base",
};

export function CTAButton(props: CTAButtonProps) {
  const {
    children,
    variant = "primary",
    size = "lg",
    icon = true,
    fullWidth = false,
    className,
  } = props;

  const shared = cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-colors duration-200",
    VARIANT_STYLES[variant],
    SIZE_STYLES[size],
    fullWidth && "w-full",
    "disabled:pointer-events-none disabled:opacity-50",
    className,
  );

  const content = (
    <>
      {"loading" in props && props.loading ? (
        <Loader2 className="size-[1.1em] animate-spin" aria-hidden />
      ) : (
        <>
          {children}
          {icon && <ArrowLeft className="size-[1.1em]" aria-hidden />}
        </>
      )}
    </>
  );

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} onClick={props.onClick} className={shared}>
        {content}
      </Link>
    );
  }

  const { type = "button", loading, disabled, onClick } = props as ButtonAsButton;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: 0.97 }}
      className={shared}
    >
      {content}
    </motion.button>
  );
}
