import type { ReactNode } from "react";
import { Briefcase, Triangle } from "lucide-react";
import { SalesTipCallout } from "@/components/courses/SalesTipCallout";
import { cn } from "@/lib/utils";

/**
 * Custom block components authors can use inside topic .mdx files to
 * reproduce the approved Playbook PDFs' visual structure natively on the
 * web. Registered on <MDXRemote components={topicMdxComponents} />.
 * See CONTENT_GUIDE.md for how content editors use these tags.
 */

export function CustomerExplain({ children }: { children: ReactNode }) {
  return <SalesTipCallout variant="customer-explain">{children}</SalesTipCallout>;
}

export function SalesTip({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <SalesTipCallout variant="sales-tip" title={title}>
      {children}
    </SalesTipCallout>
  );
}

export function CareerRole({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="not-prose my-5 flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-5 [&_p]:m-0">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--course-soft)] text-[var(--course-text-accent)]">
          <Briefcase className="size-4" />
        </div>
        <h4 className="font-bold text-slate-900">{title}</h4>
      </div>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-slate-600">{children}</div>
    </div>
  );
}

export function HighlightedConcept({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "not-prose my-5 flex items-start gap-2.5 border-e-2 border-[var(--course-primary)] py-0.5 pe-4",
        "[&_p]:m-0 [&_p]:font-semibold [&_p]:text-slate-900"
      )}
    >
      <Triangle
        className="mt-1.5 size-2.5 shrink-0 rotate-90 fill-[var(--course-primary)] text-[var(--course-primary)]"
      />
      <div className="text-base leading-relaxed">{children}</div>
    </div>
  );
}

export const topicMdxComponents = {
  CustomerExplain,
  SalesTip,
  CareerRole,
  HighlightedConcept,
};
