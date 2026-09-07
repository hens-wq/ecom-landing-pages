"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CTAButton } from "@/components/ui/CTAButton";

interface StickyMobileCTAProps {
  label: string;
  href: string;
  /** Scroll distance (px) before the bar appears — keeps it out of the way of the hero CTA. */
  revealAfter?: number;
  /**
   * Selectors (typically each lead-form section's id) to hide the bar
   * behind — a page with several forms shouldn't show a floating CTA on
   * top of a form section's own submit button. Defaults to [href].
   */
  hideWhenVisible?: string[];
}

/**
 * Mobile-only sticky action bar. Only one of these should be mounted per
 * page — it owns the bottom-of-screen z-index so it must not collide with
 * any other fixed element (e.g. a cookie banner) added later.
 */
export function StickyMobileCTA({
  label,
  href,
  revealAfter = 480,
  hideWhenVisible,
}: StickyMobileCTAProps) {
  const [pastReveal, setPastReveal] = useState(false);
  const [targetVisible, setTargetVisible] = useState(false);
  const selectors = (hideWhenVisible ?? [href]).join("|");

  useEffect(() => {
    const onScroll = () => setPastReveal(window.scrollY > revealAfter);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [revealAfter]);

  useEffect(() => {
    // Hide the pill whenever any watched section (a lead form, a CTA, the
    // Career journey, FAQ, ...) occupies the *lower* portion of the
    // viewport — not just anywhere on screen. Shrinking the observer's
    // root from the top (via rootMargin) so only the bottom band remains
    // means a section can be scrolled through entirely without ever
    // tripping this, and only counts once it actually reaches the zone
    // the pill floats over.
    const targets = selectors
      .split("|")
      .filter((selector) => selector.startsWith("#"))
      .map((selector) => document.querySelector(selector))
      .filter((el): el is Element => el !== null);

    if (targets.length === 0) return;

    const visibility = new Map<Element, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visibility.set(entry.target, entry.isIntersecting);
        setTargetVisible([...visibility.values()].some(Boolean));
      },
      { rootMargin: "-80% 0px 0px 0px", threshold: 0 },
    );
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, [selectors]);

  const visible = pastReveal && !targetVisible;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-6 bottom-[max(env(safe-area-inset-bottom),1rem)] z-40 md:hidden"
        >
          <CTAButton href={href} fullWidth size="md" className="h-[54px]">
            {label}
          </CTAButton>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
