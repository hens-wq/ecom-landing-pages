/**
 * The creative preview's pure parts: Ad ID normalization, shaping Meta's ad
 * response into what the page shows, and classifying Meta failures. Nothing here
 * touches the network, so it can be tested on its own.
 */

export type CreativeType = "image" | "video" | "carousel" | "dynamic" | "unknown";

export interface CreativeMedia {
  kind: "image" | "video";
  /** Always https. For a video this is its thumbnail - the playable file is never fetched. */
  url: string;
}

export interface AdMeta {
  adName: string | null;
  adSetName: string | null;
  campaignName: string | null;
}

export interface AdCreativeView extends AdMeta {
  adId: string;
  creativeType: CreativeType;
  primaryText: string | null;
  headline: string | null;
  description: string | null;
  /** Main visual first. Empty when Meta returns no usable image. */
  media: CreativeMedia[];
  /** Number of cards in a carousel; null for every other type. */
  cardCount: number | null;
}

export type CreativeLookup =
  | { status: "ok"; creative: AdCreativeView }
  | { status: "invalid_id" }
  | { status: "not_configured" }
  | { status: "not_found" }
  | { status: "removed"; meta: AdMeta }
  | { status: "unavailable"; meta: AdMeta }
  | { status: "no_permission" }
  | { status: "rate_limited" }
  | { status: "meta_error" };

export type MetaCallFailure = "not_found" | "no_permission" | "rate_limited" | "meta_error";

export interface RawMetaError {
  code?: number;
  error_subcode?: number;
}

export interface RawChildAttachment {
  picture?: string;
}

export interface RawLinkData {
  message?: string;
  name?: string;
  description?: string;
  picture?: string;
  child_attachments?: RawChildAttachment[];
}

export interface RawVideoData {
  message?: string;
  title?: string;
  link_description?: string;
  image_url?: string;
}

export interface RawPhotoData {
  caption?: string;
  url?: string;
}

export interface RawAssetFeedSpec {
  images?: Array<{ url?: string }>;
  videos?: Array<{ thumbnail_url?: string }>;
  bodies?: Array<{ text?: string }>;
  titles?: Array<{ text?: string }>;
  descriptions?: Array<{ text?: string }>;
}

export interface RawCreative {
  title?: string;
  body?: string;
  object_type?: string;
  image_url?: string;
  thumbnail_url?: string;
  video_id?: string;
  object_story_spec?: {
    link_data?: RawLinkData;
    video_data?: RawVideoData;
    photo_data?: RawPhotoData;
  };
  asset_feed_spec?: RawAssetFeedSpec;
}

export interface RawAdNode {
  id?: string;
  name?: string;
  account_id?: string | number;
  effective_status?: string;
  adset?: { name?: string } | null;
  campaign?: { name?: string } | null;
  creative?: RawCreative | null;
}

const MAX_MEDIA = 10;
const META_NOT_FOUND_SUBCODE = 33;
const META_PERMISSION_CODES = new Set([10, 200, 299]);
const META_RATE_LIMIT_CODES = new Set([4, 17, 32, 613, 80004]);

/**
 * Accepts the ID as it arrives from a spreadsheet or Make: digits, optionally
 * prefixed with "ag:" (any case), with spaces or invisible characters around or
 * inside it. Anything else is rejected, and the rejected value is never echoed back.
 */
export function normalizeAdId(raw: string | null | undefined): { ok: true; adId: string } | { ok: false } {
  if (typeof raw !== "string") return { ok: false };
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return { ok: false };
  }
  // \p{Cf} covers zero-width spaces, joiners, the BOM and bidi marks.
  const compact = decoded.replace(/[\s\p{Cf}]+/gu, "");
  const digits = compact.replace(/^ag:/i, "");
  if (!/^\d{6,25}$/.test(digits)) return { ok: false };
  return { ok: true, adId: digits };
}

/** Maps a failed Meta call to what the page can say about it. Meta's own message is never shown. */
export function classifyMetaFailure(httpStatus: number, error: RawMetaError | undefined): MetaCallFailure {
  if (httpStatus === 404 || (error?.code === 100 && error.error_subcode === META_NOT_FOUND_SUBCODE)) return "not_found";
  if (httpStatus === 403 || (error?.code !== undefined && META_PERMISSION_CODES.has(error.code))) return "no_permission";
  if (httpStatus === 429 || (error?.code !== undefined && META_RATE_LIMIT_CODES.has(error.code))) return "rate_limited";
  return "meta_error";
}

function firstText(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/** Only https URLs are ever rendered, so nothing else can reach an image source. */
function firstSafeUrl(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && /^https:\/\//i.test(value.trim())) return value.trim();
  }
  return null;
}

export function detectCreativeType(creative: RawCreative): CreativeType {
  const spec = creative.object_story_spec;
  const link = spec?.link_data;
  const video = spec?.video_data;
  const feed = creative.asset_feed_spec;
  const feedMedia = (feed?.images?.length ?? 0) + (feed?.videos?.length ?? 0);
  const feedTexts = (feed?.bodies?.length ?? 0) + (feed?.titles?.length ?? 0) + (feed?.descriptions?.length ?? 0);
  const cards = link?.child_attachments?.length ?? 0;

  if (feed && (feedMedia >= 2 || feedTexts >= 2)) return "dynamic";
  if (cards >= 2) return "carousel";
  if (creative.video_id || video || creative.object_type === "VIDEO" || (feed?.videos?.length ?? 0) > 0) return "video";
  if (creative.image_url || creative.thumbnail_url || link?.picture || spec?.photo_data || feed?.images?.length || creative.object_type === "PHOTO") {
    return "image";
  }
  return "unknown";
}

function extractMedia(type: CreativeType, creative: RawCreative): CreativeMedia[] {
  const spec = creative.object_story_spec;
  const link = spec?.link_data;
  const video = spec?.video_data;
  const feed = creative.asset_feed_spec;
  const media: CreativeMedia[] = [];
  const add = (kind: CreativeMedia["kind"], url: string | null) => {
    if (url) media.push({ kind, url });
  };

  if (type === "dynamic") {
    for (const image of feed?.images ?? []) add("image", firstSafeUrl(image.url));
    for (const item of feed?.videos ?? []) add("video", firstSafeUrl(item.thumbnail_url));
  } else if (type === "carousel") {
    for (const card of link?.child_attachments ?? []) add("image", firstSafeUrl(card.picture));
  } else if (type === "video") {
    add("video", firstSafeUrl(video?.image_url, creative.thumbnail_url, creative.image_url, feed?.videos?.[0]?.thumbnail_url));
  } else {
    add("image", firstSafeUrl(creative.image_url, link?.picture, spec?.photo_data?.url, creative.thumbnail_url, feed?.images?.[0]?.url));
  }

  if (media.length === 0) {
    add("image", firstSafeUrl(creative.image_url, creative.thumbnail_url));
  }
  return media.slice(0, MAX_MEDIA);
}

function buildAdMeta(node: RawAdNode): AdMeta {
  return {
    adName: firstText(node.name),
    adSetName: firstText(node.adset?.name),
    campaignName: firstText(node.campaign?.name),
  };
}

export function buildAdCreativeView(node: RawAdNode, adId: string, creative: RawCreative): AdCreativeView {
  const spec = creative.object_story_spec;
  const link = spec?.link_data;
  const video = spec?.video_data;
  const feed = creative.asset_feed_spec;
  const type = detectCreativeType(creative);

  return {
    ...buildAdMeta(node),
    adId,
    creativeType: type,
    primaryText: firstText(creative.body, link?.message, video?.message, spec?.photo_data?.caption, feed?.bodies?.[0]?.text),
    headline: firstText(creative.title, link?.name, video?.title, feed?.titles?.[0]?.text),
    description: firstText(link?.description, video?.link_description, feed?.descriptions?.[0]?.text),
    media: extractMedia(type, creative),
    cardCount: type === "carousel" ? (link?.child_attachments?.length ?? null) : null,
  };
}

/**
 * Turns Meta's ad node into a lookup result. The ad must belong to the
 * configured account - anything else is reported as not found, so the server's
 * token can't be used to view ads from other accounts.
 */
export function buildCreativeLookup(node: RawAdNode, expectedAccountId: string, adId: string): CreativeLookup {
  if (String(node.account_id ?? "") !== expectedAccountId) return { status: "not_found" };
  if (node.id !== undefined && node.id !== adId) return { status: "not_found" };

  const meta = buildAdMeta(node);
  if (node.effective_status === "DELETED") return { status: "removed", meta };
  if (!node.creative) return { status: "unavailable", meta };

  const creative = buildAdCreativeView(node, adId, node.creative);
  const hasContent =
    creative.media.length > 0 || creative.primaryText !== null || creative.headline !== null || creative.description !== null;
  return hasContent ? { status: "ok", creative } : { status: "unavailable", meta };
}
