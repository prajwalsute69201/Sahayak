/**
 * YouTube Detector & URL Validator Service
 * Accurately parses and validates YouTube video URLs and IDs.
 */

export interface ParsedYouTubeUrl {
  isValid: boolean;
  videoId?: string;
  cleanWatchUrl?: string;
  thumbnailUrl?: string;
  isShort?: boolean;
  timestampSeconds?: number;
}

// YouTube video IDs are strictly 11 characters (base64url-like: [a-zA-Z0-9_-])
const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Validates whether an ID matches the official 11-character YouTube video ID format.
 */
export function isValidVideoId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return VIDEO_ID_REGEX.test(id.trim());
}

/**
 * Parses time strings from URL parameter `t` (e.g., "120", "2m30s", "1h20m10s", "90s")
 */
export function parseTimeString(t: string): number {
  if (!t) return 0;
  // If plain number of seconds
  if (/^\d+$/.test(t)) {
    return parseInt(t, 10);
  }

  let totalSeconds = 0;
  const hoursMatch = t.match(/(\d+)h/i);
  const minutesMatch = t.match(/(\d+)m/i);
  const secondsMatch = t.match(/(\d+)s/i);

  if (hoursMatch) totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
  if (minutesMatch) totalSeconds += parseInt(minutesMatch[1], 10) * 60;
  if (secondsMatch) totalSeconds += parseInt(secondsMatch[1], 10);

  return totalSeconds;
}

/**
 * Formats seconds into human-readable timestamp (e.g. 75 -> "01:15", 3665 -> "1:01:05")
 */
export function formatSecondsToTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Parses a timestamp string like "01:23" or "1:02:15" into seconds.
 */
export function parseTimestampToSeconds(timestamp: string): number {
  if (!timestamp) return 0;
  const parts = timestamp
    .trim()
    .split(':')
    .map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return 0;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

/**
 * Detects and parses any supported YouTube video URL.
 * Handles:
 * - https://www.youtube.com/watch?v=...
 * - https://m.youtube.com/watch?v=...
 * - https://youtu.be/...
 * - https://www.youtube.com/shorts/...
 * - https://www.youtube.com/embed/...
 */
export function parseYouTubeUrl(rawUrl: string): ParsedYouTubeUrl {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false };
  }

  try {
    const url = new URL(rawUrl.trim());
    const hostname = url.hostname.toLowerCase();

    // Check YouTube hostnames
    const isYouTubeHost =
      hostname === 'www.youtube.com' ||
      hostname === 'youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'music.youtube.com';

    const isYouTuBeHost = hostname === 'youtu.be';

    if (!isYouTubeHost && !isYouTuBeHost) {
      return { isValid: false };
    }

    let videoId: string | undefined;
    let isShort = false;

    if (isYouTuBeHost) {
      // youtu.be/VIDEO_ID
      const pathSegment = url.pathname.slice(1).split('/')[0];
      if (isValidVideoId(pathSegment)) {
        videoId = pathSegment;
      }
    } else if (isYouTubeHost) {
      if (url.pathname === '/watch') {
        const v = url.searchParams.get('v');
        if (isValidVideoId(v)) {
          videoId = v!;
        }
      } else if (url.pathname.startsWith('/shorts/')) {
        const pathSegment = url.pathname.replace('/shorts/', '').split('/')[0];
        if (isValidVideoId(pathSegment)) {
          videoId = pathSegment;
          isShort = true;
        }
      } else if (url.pathname.startsWith('/embed/')) {
        const pathSegment = url.pathname.replace('/embed/', '').split('/')[0];
        if (isValidVideoId(pathSegment)) {
          videoId = pathSegment;
        }
      }
    }

    if (!videoId) {
      return { isValid: false };
    }

    const timeParam = url.searchParams.get('t');
    const timestampSeconds = timeParam ? parseTimeString(timeParam) : undefined;

    return {
      isValid: true,
      videoId,
      cleanWatchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      isShort,
      timestampSeconds,
    };
  } catch {
    return { isValid: false };
  }
}

/**
 * Checks if a given URL is a valid, supported YouTube video.
 */
export function isYouTubeVideoUrl(url: string): boolean {
  return parseYouTubeUrl(url).isValid;
}
