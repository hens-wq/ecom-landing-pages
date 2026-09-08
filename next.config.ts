import type { NextConfig } from "next";

/**
 * Two build modes share this one config so the normal Node.js/Vercel
 * deployment (default) is completely untouched:
 *
 *   npm run build             -> normal build, /api/lead works, unchanged
 *   npm run build:static      -> STATIC_EXPORT=1, produces ./out for a
 *                                 plain Apache/cPanel static host with no
 *                                 Node.js runtime (see scripts/build-static.sh)
 *   npm run build:static:ai   -> same, for the AI page (see
 *                                 scripts/build-static-ai.sh)
 *
 * STATIC_BASE_PATH controls where in the static build the site expects to
 * live — "/cyber" (default) for https://domain.com/cyber/, or "" for the
 * domain root. Re-run `STATIC_BASE_PATH=... npm run build:static` if the
 * hosting target changes; nothing else needs to change.
 *
 * STATIC_PAGE picks which campaign page "/" (out/index.html) renders in
 * a static export, since output:"export" builds every route in the app
 * (both /lp/brand/cyber and /lp/brand/ai) but a static host needs a real
 * index.html at its root, not a redirect (see app/page.tsx). Defaults to
 * "cyber" so the existing build:static command's output is unchanged —
 * only scripts/build-static-ai.sh sets it to "ai".
 */
const isStaticExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.STATIC_BASE_PATH ?? "/cyber";
const staticPage = process.env.STATIC_PAGE ?? "cyber";

const nextConfig: NextConfig = isStaticExport
  ? {
      output: "export",
      images: { unoptimized: true },
      trailingSlash: true,
      basePath,
      env: {
        NEXT_PUBLIC_STATIC_EXPORT: "1",
        NEXT_PUBLIC_BASE_PATH: basePath,
        NEXT_PUBLIC_STATIC_PAGE: staticPage,
      },
    }
  : {};

export default nextConfig;
