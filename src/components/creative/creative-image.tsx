"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff, Play } from "lucide-react";

import { cn } from "@/lib/utils";

interface CreativeImageProps {
  src: string;
  alt: string;
  isVideo: boolean;
  variant: "main" | "thumb";
}

/**
 * A plain <img> on purpose: Meta's CDN links are not configured as Next.js image
 * domains, and they expire. When a link no longer loads, the frame says so
 * instead of showing a broken image.
 */
export function CreativeImage({ src, alt, isVideo, variant }: CreativeImageProps) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const isThumb = variant === "thumb";

  // The page is server-rendered, so an image can fail before React attaches onError. A broken image is caught here too.
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth === 0) setFailed(true);
  }, []);
  const frameClass = cn("relative overflow-hidden bg-muted", isThumb ? "aspect-square rounded-md" : "rounded-lg");

  if (failed) {
    return (
      <div
        className={cn(
          frameClass,
          "flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground",
          !isThumb && "min-h-72"
        )}
      >
        <ImageOff className="size-4" />
        התצוגה אינה זמינה
      </div>
    );
  }

  return (
    <div className={frameClass}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Meta CDN links are not configured as Next.js image domains */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={isThumb ? "lazy" : undefined}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn("block w-full", isThumb ? "absolute inset-0 h-full object-cover" : "h-auto max-h-[75vh] object-contain")}
      />
      {isVideo ? (
        <span className="pointer-events-none absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white">
          <Play className="size-5 fill-current" />
        </span>
      ) : null}
    </div>
  );
}
