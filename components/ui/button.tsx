import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--course-primary,var(--brand-purple))] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--course-primary,var(--brand-purple))] text-white shadow-sm hover:opacity-90 active:opacity-80",
        secondary:
          "bg-[var(--course-soft,#f1e9fe)] text-[var(--course-text-accent,var(--brand-purple))] hover:opacity-80",
        outline:
          "border border-[var(--course-border,#e2e8f0)] bg-white text-slate-900 hover:bg-slate-50",
        ghost: "text-slate-700 hover:bg-slate-100",
        link: "text-[var(--course-primary,var(--brand-purple))] underline-offset-4 hover:underline",
        destructive: "bg-red-600 text-white hover:bg-red-700",
      },
      size: {
        default: "h-11 px-5 py-2 text-sm",
        sm: "h-9 px-3.5 text-sm",
        lg: "h-13 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
