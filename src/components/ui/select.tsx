import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/** Native <select>, styled to match Input/Button - simpler and more accessible than a custom popover for dense, exhaustive-option inline table editing (see components/leads/status-select.tsx). */
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative inline-block">
      <select
        data-slot="select"
        className={cn(
          "h-8 w-full appearance-none rounded-md border border-input bg-card py-1 pr-2 pl-7 text-xs shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export { Select };
