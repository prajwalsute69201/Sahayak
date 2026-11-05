/**
 * YouTube Metadata Extraction Service
 * Retrieves video title, channel name, thumbnail, and duration via DOM inspection or public oEmbed.
 */

import { YouTubeVideoMetadata } from '../types/youtube.types';
import { parseYouTubeUrl, formatSecondsToTimestamp } from './youtube-detector.service';

/**
 * Parses duration from ISO 8601 duration string (e.g. PT1H2M30S or PT4M15S)
 */
export function parseIsoDuration(duration: string): number {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Extracts metadata directly from YouTube page DOM.
 * Executed in page context or content script.
 */
export function extractMetadataFromDOM(doc: Document = document): Partial<YouTubeVideoMetadata> {
  // Title
  let title = '';
  const titleEl = doc.querySelector(
    'h1.ytd-watch-metadata yt-formatted-string, #title h1, h1.title'
  );
  if (titleEl && titleEl.textContent?.trim()) {
    title = titleEl.textContent.trim();
  } else {
    const metaTitle = doc.querySelector('meta[name="title"], meta[property="og:title"]');
    if (metaTitle) {
      title = metaTitle.getAttribute('content') || '';
    }
  }

  if (!title && doc.title) {
    title = doc.title.replace(/\s*-\s*YouTube$/i, '').trim();
  }

  // Channel Name
  let channelName = '';
  const channelEl = doc.querySelector(
    'ytd-channel-name a, ytd-channel-name yt-formatted-string a, #owner #channel-name a, #channel-name a, [itemprop="author"] [itemprop="name"]'
  );
  if (channelEl && channelEl.textContent?.trim()) {
    channelName = channelEl.textContent.trim();
  } else {
    const metaAuthor = doc.querySelector('link[itemprop="name"]');
    if (metaAuthor) {
      channelName = metaAuthor.getAttribute('content') || '';
    }
  }

  // Duration
  let durationSeconds: number | undefined;
  const videoEl = doc.querySelector('video') as HTMLVideoElement | null;
  if (videoEl && !isNaN(videoEl.duration) && videoEl.duration > 0) {
    durationSeconds = Math.round(videoEl.duration);
  } else {
    const durationMeta = doc.querySelector('meta[itemprop="duration"]');
    if (durationMeta) {
      const iso = durationMeta.getAttribute('content') || '';
      const parsed = parseIsoDuration(iso);
      if (parsed > 0) durationSeconds = parsed;
    }
  }

  return {
    title: title || undefined,
    channelName: channelName || undefined,
    durationSeconds,
    durationFormatted: durationSeconds ? formatSecondsToTimestamp(durationSeconds) : undefined,
  };
}

/**
 * Fetches public metadata using YouTube's documented oEmbed endpoint.
 * Requires no API key, returns official video title, author, and thumbnail.
 */
export async function fetchMetadataFromOEmbed(
  videoUrl: string
): Promise<{ title?: string; channelName?: string; thumbnailUrl?: string }> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const response = await fetch(oembedUrl);
    if (!response.ok) {
      return {};
    }
    const data = await response.json();
    return {
      title: typeof data.title === 'string' ? data.title.trim() : undefined,
      channelName: typeof data.author_name === 'string' ? data.author_name.trim() : undefined,
      thumbnailUrl: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Resolves comprehensive metadata for a YouTube video URL or ID.
 */
export async function resolveYouTubeMetadata(
  urlOrId: string,
  domOverride?: Document
): Promise<YouTubeVideoMetadata | null> {
  const parsed = parseYouTubeUrl(
    urlOrId.includes('://') ? urlOrId : `https://www.youtube.com/watch?v=${urlOrId}`
  );
  if (!parsed.isValid || !parsed.videoId) {
    return null;
  }

  const videoId = parsed.videoId;
  const videoUrl = parsed.cleanWatchUrl!;
  const defaultThumbnail = parsed.thumbnailUrl!;

  // 1. Try DOM if available (e.g. active tab or mock)
  let domMeta: Partial<YouTubeVideoMetadata> = {};
  if (domOverride) {
    domMeta = extractMetadataFromDOM(domOverride);
  } else if (
    typeof document !== 'undefined' &&
    window.location?.hostname?.includes('youtube.com')
  ) {
    domMeta = extractMetadataFromDOM(document);
  }

  // 2. If DOM metadata is incomplete, query official oEmbed API
  let oembedMeta: { title?: string; channelName?: string; thumbnailUrl?: string } = {};
  if (!domMeta.title || !domMeta.channelName) {
    oembedMeta = await fetchMetadataFromOEmbed(videoUrl);
  }

  const finalTitle = domMeta.title || oembedMeta.title || `YouTube Video (${videoId})`;
  const finalChannel = domMeta.channelName || oembedMeta.channelName || 'YouTube Creator';
  const finalThumbnail = oembedMeta.thumbnailUrl || defaultThumbnail;

  return {
    videoId,
    title: finalTitle,
    channelName: finalChannel,
    videoUrl,
    thumbnailUrl: finalThumbnail,
    durationSeconds: domMeta.durationSeconds,
    durationFormatted: domMeta.durationFormatted,
    isShort: parsed.isShort,
  };
}
