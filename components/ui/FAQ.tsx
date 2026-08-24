"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  items: FAQItem[];
  className?: string;
  tone?: "dark" | "light";
}

const TONE_CLASS = {
  dark: {
    container: "divide-white/10 border-white/10",
    item: "border-white/10",
    question: "text-off-white",
    icon: "text-ink-300",
    iconOpen: "text-brand-400",
    answer: "text-ink-300",
  },
  light: {
    container: "divide-ink-200 border-ink-200",
    item: "border-ink-200",
    question: "text-ink-950",
    icon: "text-ink-400",
    iconOpen: "text-brand-600",
    answer: "text-ink-500",
  },
} as const;

export function FAQ({ items, className, tone = "dark" }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const t = TONE_CLASS[tone];

  return (
    <div className={cn("divide-y border-t", t.container, className)}>
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.question} className={cn("border-b", t.item)}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 py-5 text-start"
            >
              <span className={cn("text-[17px] font-medium", t.question)}>{item.question}</span>
              <ChevronDown
                className={cn(
                  "size-5 shrink-0 transition-transform duration-300",
                  isOpen ? cn("-rotate-180", t.iconOpen) : t.icon,
                )}
                aria-hidden
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className={cn("pb-5 pe-8 leading-relaxed", t.answer)}>{item.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
