"use client";

import { CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

interface FormSuccessStateProps {
  title?: string;
  message?: string;
}

export function FormSuccessState({
  title = "הפרטים התקבלו בהצלחה",
  message = "ניצור איתך קשר בהקדם.",
}: FormSuccessStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-3 py-10 text-center"
      role="status"
    >
      <CheckCircle2 className="size-12 text-lime-500" aria-hidden />
      <p className="text-display-sm text-off-white">{title}</p>
      <p className="text-ink-200">{message}</p>
    </motion.div>
  );
}
