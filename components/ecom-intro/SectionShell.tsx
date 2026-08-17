import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionShell({
  children,
  className,
  maxWidthClassName = "max-w-5xl",
}: {
  children: ReactNode;
  className?: string;
  maxWidthClassName?: string;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-20 sm:px-10">
      <div
        className={cn(
          "relative z-10 mx-auto flex w-full flex-1 flex-col items-center justify-center gap-8 text-center",
          maxWidthClassName,
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
