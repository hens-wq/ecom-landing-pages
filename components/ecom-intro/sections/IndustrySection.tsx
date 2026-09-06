"use client";

import Image from "next/image";
import type { IntroBrandContent, IntroIndustryContent } from "@/lib/content/schemas";

/**
 * This slide renders the approved design image directly, pixel-for-pixel,
 * per explicit instruction: no React-recreated logos, orbit lines, cards or
 * decorations. Only Continue/Back are real (transparent overlays aligned
 * over the button locations already drawn into the image) - the progress
 * counter is handled by the parent IntroExperience component, not here.
 *
 * IMAGE_WIDTH/IMAGE_HEIGHT are the source PNG's exact pixel dimensions,
 * passed to next/image (non-fill) so the browser preserves its native
 * aspect ratio while width/height are capped responsively - this is what
 * lets the image scale to fit the viewport without ever cropping or
 * stretching. NAV_HOTSPOTS are percentages of that same box, measured
 * directly off the approved image, so the invisible buttons track the
 * visible "המשך"/"חזרה" artwork at any screen size.
 */
const IMAGE_WIDTH = 1672;
const IMAGE_HEIGHT = 941;

const NAV_HOTSPOTS = {
  next: { left: "39.5%", top: "88.5%", width: "11.5%", height: "7.5%" },
  prev: { left: "52.5%", top: "88.5%", width: "7%", height: "7.5%" },
} as const;

export function IndustrySection({
  onNext,
  onPrev,
}: {
  content: IntroIndustryContent;
  brand: IntroBrandContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-white p-4 sm:p-8">
      <div className="relative inline-block">
        <Image
          src="/ecom-intro/industry/industry-slide-approved.png"
          alt="Ecom מחוברת לתעשייה - שיתופי הפעולה של המכללה עם חברות מובילות"
          width={IMAGE_WIDTH}
          height={IMAGE_HEIGHT}
          priority
          sizes="100vw"
          className="h-auto max-h-[92dvh] w-auto max-w-full object-contain"
        />

        <button
          type="button"
          onClick={onNext}
          aria-label="המשך"
          className="absolute cursor-pointer outline-none"
          style={NAV_HOTSPOTS.next}
        />
        <button
          type="button"
          onClick={onPrev}
          aria-label="חזרה"
          className="absolute cursor-pointer outline-none"
          style={NAV_HOTSPOTS.prev}
        />
      </div>
    </div>
  );
}
