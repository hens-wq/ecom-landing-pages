"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CTAButton } from "@/components/ui/CTAButton";

interface StickyMobileCTAProps {
  label: string;
  href: string;
  /** Scroll distance (px) before the bar appears — keeps it out of the way of the hero CTA. */
  revealAfter?: number;
}

/**
 * Mobile-only sticky action bar. Only one of these should be mounted per
 * page — it owns the bottom-of-screen z-index so it must not collide with
 * any other fixed element (e.g. a cookie banner) added later.
 */
export function StickyMobileCTA({ label, href, revealAfter = 480 }: StickyMobileCTAProps) {
  const [pastReveal, setPastReveal] = useState(false);
  const [targetVisible, setTargetVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setPastReveal(window.scrollY > revealAfter);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [revealAfter]);

  useEffect(() => {
    // If the CTA points at an in-page target (typically the lead form),
    // hide the bar once that target is already on screen — otherwise it
    // sits directly on top of the section's own submit button.
    if (!href.startsWith("#")) return;
    const target = document.querySelector(href);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setTargetVisible(entry.isIntersecting), {
      threshold: 0.2,
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [href]);

  const visible = pastReveal && !targetVisible;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 96, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/90 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur-md md:hidden"
        >
          <CTAButton href={href} fullWidth size="md">
            {label}
          </CTAButton>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
