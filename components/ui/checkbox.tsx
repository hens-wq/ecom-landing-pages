"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4.5 shrink-0 rounded-md border border-slate-300 bg-white transition-colors data-[state=checked]:border-[var(--course-primary,var(--brand-purple))] data-[state=checked]:bg-[var(--course-primary,var(--brand-purple))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--course-primary,var(--brand-purple))] focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        <Check className="size-3" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
