import type { NextConfig } from "next";

/**
 * Two build modes share this one config so the normal Node.js/Vercel
 * deployment (default) is completely untouched:
 *
 *   npm run build          -> normal build, /api/lead works, unchanged
 *   npm run build:static   -> STATIC_EXPORT=1, produces ./out for a plain
 *                             Apache/cPanel static host with no Node.js
 *                             runtime (see scripts/build-static.sh)
 *
 * STATIC_BASE_PATH controls where in the static build the site expects to
 * live — "/cyber" (default) for https://domain.com/cyber/, or "" for the
 * domain root. Re-run `STATIC_BASE_PATH=... npm run build:static` if the
 * hosting target changes; nothing else needs to change.
 */
const isStaticExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.STATIC_BASE_PATH ?? "/cyber";

const nextConfig: NextConfig = isStaticExport
  ? {
      output: "export",
      images: { unoptimized: true },
      trailingSlash: true,
      basePath,
      env: {
        NEXT_PUBLIC_STATIC_EXPORT: "1",
        NEXT_PUBLIC_BASE_PATH: basePath,
      },
    }
  : {};

export default nextConfig;
