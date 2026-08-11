import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium w-fit whitespace-nowrap",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--course-soft,#f1e9fe)] text-[var(--course-text-accent,var(--brand-purple))]",
        outline: "border-[var(--course-border,#e2e8f0)] text-slate-700 bg-white",
        success: "border-transparent bg-emerald-50 text-emerald-700",
        muted: "border-transparent bg-slate-100 text-slate-600",
        solid: "border-transparent bg-[var(--course-primary,var(--brand-purple))] text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
