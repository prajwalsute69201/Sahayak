import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isValidVideoId,
  parseTimeString,
  formatSecondsToTimestamp,
  parseTimestampToSeconds,
  parseYouTubeUrl,
  isYouTubeVideoUrl,
} from '../src/features/youtube-summary/services/youtube-detector.service';
import {
  parseIsoDuration,
  extractMetadataFromDOM,
  resolveYouTubeMetadata,
} from '../src/features/youtube-summary/services/youtube-metadata.service';
import {
  decodeHtmlEntities,
  stripAudioNoiseMarkers,
  deduplicateAdjacentText,
  cleanAndMergeTranscript,
  formatTranscriptForPrompt,
} from '../src/features/youtube-summary/services/transcript-cleaner.service';
import {
  chunkTranscript,
  DEFAULT_MAX_CHUNK_CHARS,
} from '../src/features/youtube-summary/services/transcript-chunker.service';
import {
  parseTimedTextXml,
  parseTimedTextJson3,
  selectBestCaptionTrack,
  extractPlayerResponseFromHtml,
  retrieveYouTubeTranscript,
} from '../src/features/youtube-summary/services/transcript.service';
import {
  buildYouTubeSummaryPrompt,
  parseYouTubeSummaryResponse,
  fallbackMarkdownParser,
  normalizeSummaryJson,
  generateYouTubeSummary,
  seekVideoInTab,
} from '../src/features/youtube-summary/services/youtube-summary.service';
import { geminiClient } from '../src/services/geminiClient';
import {
  TranscriptSegment,
  YouTubeVideoMetadata,
} from '../src/features/youtube-summary/types/youtube.types';

// Mock geminiClient
vi.mock('../src/services/geminiClient', () => ({
  geminiClient: {
    generateText: vi.fn(),
  },
}));

describe('YouTube Summary Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. YouTube Video URL Detection & ID Validation', () => {
    it('validates 11-character video IDs accurately', () => {
      expect(isValidVideoId('dQw4w9WgXcQ')).toBe(true);
      expect(isValidVideoId('M7lc1UVf-VE')).toBe(true);
      expect(isValidVideoId('1234567890_')).toBe(true);
      expect(isValidVideoId('short')).toBe(false);
      expect(isValidVideoId('waytoolongvideoid123456')).toBe(false);
      expect(isValidVideoId('invalid$char')).toBe(false);
      expect(isValidVideoId(null)).toBe(false);
      expect(isValidVideoId(undefined)).toBe(false);
    });

    it('parses timestamps from URL parameter t', () => {
      expect(parseTimeString('120')).toBe(120);
      expect(parseTimeString('2m30s')).toBe(150);
      expect(parseTimeString('1h10m5s')).toBe(4205);
      expect(parseTimeString('45s')).toBe(45);
      expect(parseTimeString('')).toBe(0);
    });

    it('formats seconds to human-readable timestamp', () => {
      expect(formatSecondsToTimestamp(0)).toBe('00:00');
      expect(formatSecondsToTimestamp(75)).toBe('01:15');
      expect(formatSecondsToTimestamp(3665)).toBe('1:01:05');
      expect(formatSecondsToTimestamp(-10)).toBe('00:00');
    });

    it('parses timestamp strings back to seconds', () => {
      expect(parseTimestampToSeconds('01:15')).toBe(75);
      expect(parseTimestampToSeconds('1:01:05')).toBe(3665);
      expect(parseTimestampToSeconds('00:00')).toBe(0);
      expect(parseTimestampToSeconds('')).toBe(0);
    });

    it('detects and parses all supported YouTube video URL formats', () => {
      // Standard watch URL
      const watch = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(watch.isValid).toBe(true);
      expect(watch.videoId).toBe('dQw4w9WgXcQ');
      expect(watch.cleanWatchUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(watch.thumbnailUrl).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
      expect(watch.isShort).toBe(false);

      // Shortened youtu.be URL
      const shortUrl = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?t=1m20s');
      expect(shortUrl.isValid).toBe(true);
      expect(shortUrl.videoId).toBe('dQw4w9WgXcQ');
      expect(shortUrl.timestampSeconds).toBe(80);

      // Shorts URL
      const shorts = parseYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
      expect(shorts.isValid).toBe(true);
      expect(shorts.videoId).toBe('dQw4w9WgXcQ');
      expect(shorts.isShort).toBe(true);

      // Embed URL
      const embed = parseYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(embed.isValid).toBe(true);
      expect(embed.videoId).toBe('dQw4w9WgXcQ');

      // Mobile URL
      const mobile = parseYouTubeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(mobile.isValid).toBe(true);
      expect(mobile.videoId).toBe('dQw4w9WgXcQ');
    });

    it('rejects unsupported and malformed URLs', () => {
      expect(isYouTubeVideoUrl('https://google.com')).toBe(false);
      expect(isYouTubeVideoUrl('https://youtube.com')).toBe(false);
      expect(isYouTubeVideoUrl('https://youtube.com/feed/subscriptions')).toBe(false);
      expect(isYouTubeVideoUrl('https://youtube.com/watch?v=short')).toBe(false);
      expect(isYouTubeVideoUrl('not-a-url')).toBe(false);
    });
  });

  describe('2. Metadata Extraction', () => {
    it('parses ISO 8601 durations correctly', () => {
      expect(parseIsoDuration('PT4M15S')).toBe(255);
      expect(parseIsoDuration('PT1H2M30S')).toBe(3750);
      expect(parseIsoDuration('PT30S')).toBe(30);
      expect(parseIsoDuration('')).toBe(0);
    });

    it('extracts metadata from document DOM structure', () => {
      const mockDoc = document.implementation.createHTMLDocument();
      mockDoc.title = 'Building Modern Web Apps - YouTube';
      const metaTitle = mockDoc.createElement('meta');
      metaTitle.setAttribute('name', 'title');
      metaTitle.setAttribute('content', 'Building Modern Web Apps');
      mockDoc.head.appendChild(metaTitle);

      const channelLink = mockDoc.createElement('a');
      channelLink.textContent = 'Chrome Developers';
      const channelContainer = mockDoc.createElement('ytd-channel-name');
      channelContainer.appendChild(channelLink);
      mockDoc.body.appendChild(channelContainer);

      const metaDuration = mockDoc.createElement('meta');
      metaDuration.setAttribute('itemprop', 'duration');
      metaDuration.setAttribute('content', 'PT10M30S');
      mockDoc.head.appendChild(metaDuration);

      const result = extractMetadataFromDOM(mockDoc);
      expect(result.title).toBe('Building Modern Web Apps');
      expect(result.channelName).toBe('Chrome Developers');
      expect(result.durationSeconds).toBe(630);
      expect(result.durationFormatted).toBe('10:30');
    });

    it('resolves metadata with fallback values when DOM is incomplete', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Never Gonna Give You Up',
          author_name: 'Rick Astley',
          thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        }),
      } as unknown as Response);

      const mockDoc = document.implementation.createHTMLDocument();
      const meta = await resolveYouTubeMetadata('dQw4w9WgXcQ', mockDoc);

      expect(meta).not.toBeNull();
      expect(meta?.videoId).toBe('dQw4w9WgXcQ');
      expect(meta?.title).toBe('Never Gonna Give You Up');
      expect(meta?.channelName).toBe('Rick Astley');
      expect(meta?.thumbnailUrl).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
      expect(meta?.videoUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });
  });

  describe('3. Transcript Cleaning & Normalization', () => {
    it('decodes standard HTML entities', () => {
      expect(decodeHtmlEntities('Rock &amp; Roll&#39;s &quot;Best&quot;')).toBe(
        `Rock & Roll's "Best"`
      );
      expect(decodeHtmlEntities('5 &gt; 3 &amp;&amp; 2 &lt; 4')).toBe('5 > 3 && 2 < 4');
    });

    it('strips non-verbal audio noise artifacts', () => {
      expect(stripAudioNoiseMarkers('[Music] Welcome back to the show [Applause]')).toBe(
        'Welcome back to the show'
      );
      expect(stripAudioNoiseMarkers('♪ intro theme ♪ (laughter) good morning')).toBe(
        'good morning'
      );
    });

    it('deduplicates rolling words from adjacent ASR segments', () => {
      const prev = 'welcome back to';
      const curr = 'to the channel everyone';
      const deduped = deduplicateAdjacentText(prev, curr);
      expect(deduped).toBe('the channel everyone');
    });

    it('cleans and merges fragmented transcript segments into coherent sentences', () => {
      const raw = [
        { start: 0, dur: 1.5, text: 'Hello and &amp;' },
        { start: 1.5, dur: 1.2, text: '[Music] welcome to the' },
        { start: 2.7, dur: 2.0, text: 'presentation today.' },
        { start: 10.0, dur: 3.0, text: 'Let us discuss our agenda.' },
      ];

      const merged = cleanAndMergeTranscript(raw, 2.5);
      expect(merged.length).toBe(2);
      expect(merged[0].timestamp).toBe('00:00');
      expect(merged[0].text).toBe('Hello and & welcome to the presentation today.');
      expect(merged[1].timestamp).toBe('00:10');
      expect(merged[1].text).toBe('Let us discuss our agenda.');
    });

    it('formats transcript segments with timestamps for prompt injection', () => {
      const segments: TranscriptSegment[] = [
        { startSeconds: 0, durationSeconds: 5, timestamp: '00:00', text: 'Introduction.' },
        {
          startSeconds: 15,
          durationSeconds: 10,
          timestamp: '00:15',
          text: 'Architecture deep dive.',
        },
      ];

      const formatted = formatTranscriptForPrompt(segments);
      expect(formatted).toBe('[00:00] Introduction.\n[00:15] Architecture deep dive.');
    });
  });

  describe('4. Transcript Chunking with Timestamp Preservation', () => {
    it('creates a single chunk for transcripts under character threshold', () => {
      const segments: TranscriptSegment[] = [
        { startSeconds: 0, durationSeconds: 10, timestamp: '00:00', text: 'Short clip segment 1.' },
        {
          startSeconds: 10,
          durationSeconds: 10,
          timestamp: '00:10',
          text: 'Short clip segment 2.',
        },
      ];

      const chunks = chunkTranscript(segments, DEFAULT_MAX_CHUNK_CHARS);
      expect(chunks.length).toBe(1);
      expect(chunks[0].chunkIndex).toBe(1);
      expect(chunks[0].totalChunks).toBe(1);
      expect(chunks[0].startTime).toBe('00:00');
      expect(chunks[0].endTime).toBe('00:20');
      expect(chunks[0].segments.length).toBe(2);
    });

    it('splits long transcripts into multiple chunks while keeping timing metadata', () => {
      const segments: TranscriptSegment[] = [];
      // Generate 20 segments of ~50 characters each
      for (let i = 0; i < 20; i++) {
        segments.push({
          startSeconds: i * 30,
          durationSeconds: 30,
          timestamp: formatSecondsToTimestamp(i * 30),
          text: `Detailed discussion point number ${i} on system reliability and scaling.`,
        });
      }

      // Force chunks of small size (~300 chars)
      const chunks = chunkTranscript(segments, 300);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].chunkIndex).toBe(1);
      expect(chunks[0].totalChunks).toBe(chunks.length);
      expect(chunks[0].startTime).toBe('00:00');
      // Ensure all segments are accounted for
      const totalSegs = chunks.reduce((acc, c) => acc + c.segments.length, 0);
      expect(totalSegs).toBe(20);
    });
  });

  describe('5. Transcript Parsing & Track Selection', () => {
    it('parses timedtext XML accurately', () => {
      const xml = `
        <transcript>
          <text start="1.5" dur="3.0">First sentence</text>
          <text start="4.5" dur="2.5">Second sentence</text>
        </transcript>
      `;
      const segments = parseTimedTextXml(xml);
      expect(segments.length).toBe(2);
      expect(segments[0].start).toBe(1.5);
      expect(segments[0].dur).toBe(3.0);
      expect(segments[0].text).toBe('First sentence');
    });

    it('parses timedtext JSON3 accurately', () => {
      const json3 = {
        events: [
          {
            tStartMs: 2000,
            dDurationMs: 3000,
            segs: [{ utf8: 'Hello ' }, { utf8: 'world' }],
          },
          {
            tStartMs: 5000,
            dDurationMs: 4000,
            segs: [{ utf8: 'Next line' }],
          },
        ],
      };

      const segments = parseTimedTextJson3(json3);
      expect(segments.length).toBe(2);
      expect(segments[0].start).toBe(2);
      expect(segments[0].dur).toBe(3);
      expect(segments[0].text).toBe('Hello world');
    });

    it('selects the best caption track prioritizing manual English', () => {
      const tracks = [
        {
          languageCode: 'es',
          languageName: 'Spanish',
          isAutoGenerated: false,
          baseUrl: 'https://youtube.com/timedtext?lang=es',
        },
        {
          languageCode: 'en',
          languageName: 'English (auto-generated)',
          isAutoGenerated: true,
          baseUrl: 'https://youtube.com/timedtext?lang=en&kind=asr',
        },
        {
          languageCode: 'en',
          languageName: 'English',
          isAutoGenerated: false,
          baseUrl: 'https://youtube.com/timedtext?lang=en',
        },
      ];

      const best = selectBestCaptionTrack(tracks, 'en');
      expect(best?.isAutoGenerated).toBe(false);
      expect(best?.languageCode).toBe('en');
    });

    it('extracts player response from HTML script tags', () => {
      const html = `
        <html>
          <script>
            var ytInitialPlayerResponse = {"playabilityStatus":{"status":"OK"},"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"baseUrl":"https://youtube.com/timedtext","languageCode":"en"}]}}};
          </script>
        </html>
      `;
      const response = extractPlayerResponseFromHtml(html);
      expect(response?.playabilityStatus?.status).toBe('OK');
      expect(
        response?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.[0].languageCode
      ).toBe('en');
    });
  });

  describe('6. Gemini Prompt Security & Schema Validation', () => {
    const mockMetadata: YouTubeVideoMetadata = {
      videoId: 'dQw4w9WgXcQ',
      title: 'Reliable Cloud Architectures',
      channelName: 'Google Cloud Tech',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      durationSeconds: 600,
      durationFormatted: '10:00',
    };

    it('builds hardened prompt isolating untrusted transcript with delimiter tags', () => {
      const { systemInstruction, userPrompt } = buildYouTubeSummaryPrompt(
        mockMetadata,
        '[00:00] Starting talk.\n[02:00] Architecture diagrams.'
      );

      expect(systemInstruction).toContain('UNTRUSTED INPUT ISOLATION');
      expect(systemInstruction).toContain('<VIDEO_TRANSCRIPT>');
      expect(systemInstruction).toContain('PROMPT INJECTION DEFENSE');
      expect(userPrompt).toContain('<VIDEO_METADATA>');
      expect(userPrompt).toContain('Title: Reliable Cloud Architectures');
      expect(userPrompt).toContain('<VIDEO_TRANSCRIPT>');
    });

    it('validates and normalizes well-formed JSON summary responses', () => {
      const jsonStr = JSON.stringify({
        overview: 'Overview of resilient systems.',
        keyTakeaways: ['High availability is crucial', 'Use multi-region redundancy'],
        detailedSummary: 'A thorough deep-dive into cloud architectures.',
        importantMoments: [
          {
            timestamp: '01:30',
            title: 'Failover strategies',
            description: 'Explaining auto-recovery',
          },
        ],
        importantFacts: ['99.99% uptime achieved'],
        conclusion: 'Resilience requires proactive testing.',
        topicsAndKeywords: ['Cloud', 'SRE', 'Redundancy'],
      });

      const summary = parseYouTubeSummaryResponse(jsonStr);
      expect(summary.overview).toBe('Overview of resilient systems.');
      expect(summary.keyTakeaways.length).toBe(2);
      expect(summary.importantMoments[0].timestamp).toBe('01:30');
      expect(summary.importantMoments[0].seconds).toBe(90);
      expect(summary.importantMoments[0].title).toBe('Failover strategies');
      expect(summary.topicsAndKeywords).toContain('Cloud');
    });

    it('falls back to regex parsing when Gemini outputs markdown format', () => {
      const markdown = `
### Quick Overview
This video explains how distributed systems handle node failures.

### Key Takeaways
- Redundancy prevents single point of failure
- Consensus algorithms coordinate distributed state
- Graceful degradation maintains user experience

### Important Moments
- [02:15] **Consensus Protocols**: Raft and Paxos comparison
- [05:40] **Circuit Breakers**: Preventing cascading outages

### Detailed Summary
The presentation begins with network partitions and explains quorum-based voting.

### Important Facts
- 50ms average heartbeat latency
- 3 node minimum for quorum

### Conclusion
Always design for failure from day one.

### Topics & Keywords
Distributed Systems, Raft, Paxos, Resilience
      `;

      const summary = fallbackMarkdownParser(markdown);
      expect(summary.overview).toContain('distributed systems handle node failures');
      expect(summary.keyTakeaways.length).toBe(3);
      expect(summary.importantMoments.length).toBe(2);
      expect(summary.importantMoments[0].timestamp).toBe('02:15');
      expect(summary.importantMoments[0].seconds).toBe(135);
      expect(summary.importantFacts.length).toBe(2);
      expect(summary.conclusion).toContain('Always design for failure');
    });

    it('handles unexpected empty or invalid input safely', () => {
      expect(() => parseYouTubeSummaryResponse('')).toThrow();
      const normalized = normalizeSummaryJson({});
      expect(normalized.overview).toBe('Video overview.');
      expect(normalized.keyTakeaways.length).toBeGreaterThan(0);
      expect(normalized.conclusion).toBe('Main takeaway from the video.');
    });
  });

  describe('7. End-to-End Summarisation Pipeline', () => {
    const mockMetadata: YouTubeVideoMetadata = {
      videoId: 'test_vid_123',
      title: 'Intro to Web APIs',
      channelName: 'Dev Academy',
      videoUrl: 'https://www.youtube.com/watch?v=test_vid_123',
      thumbnailUrl: 'https://i.ytimg.com/vi/test_vid_123/hqdefault.jpg',
    };

    const mockSegments: TranscriptSegment[] = [
      { startSeconds: 0, durationSeconds: 10, timestamp: '00:00', text: 'Welcome to Web APIs.' },
      {
        startSeconds: 10,
        durationSeconds: 15,
        timestamp: '00:10',
        text: 'We will explore REST and GraphQL.',
      },
    ];

    it('invokes Gemini client and returns structured summary', async () => {
      const mockGeminiResponse = {
        text: JSON.stringify({
          overview: 'Comprehensive guide to web APIs.',
          keyTakeaways: ['REST is ubiquitous', 'GraphQL enables selective queries'],
          detailedSummary: 'The video breaks down request lifecycle and protocol tradeoffs.',
          importantMoments: [
            {
              timestamp: '00:10',
              title: 'REST vs GraphQL',
              description: 'Comparing data delivery patterns',
            },
          ],
          importantFacts: ['HTTP/2 multiplexing reduces latency'],
          conclusion: 'Choose the right API paradigm for your client needs.',
          topicsAndKeywords: ['REST', 'GraphQL', 'APIs'],
        }),
      };

      vi.mocked(geminiClient.generateText).mockResolvedValueOnce({
        text: mockGeminiResponse.text,
        model: 'gemini-2.0-flash-lite',
        latencyMs: 150,
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10, totalTokenCount: 20 },
      });

      const summary = await generateYouTubeSummary(mockMetadata, mockSegments);

      expect(geminiClient.generateText).toHaveBeenCalledTimes(1);
      expect(summary.overview).toBe('Comprehensive guide to web APIs.');
      expect(summary.keyTakeaways.length).toBe(2);
      expect(summary.importantMoments[0].seconds).toBe(10);
    });

    it('throws when attempting to summarize empty transcript segments', async () => {
      await expect(generateYouTubeSummary(mockMetadata, [])).rejects.toThrow(
        'Cannot summarize empty video transcript'
      );
    });

    it('gracefully handles missing captions in transcript retrieval', async () => {
      const result = await retrieveYouTubeTranscript('invalid_id_99', 'en', []);
      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_URL');
    });
  });

  describe('8. Timestamp In-Page Seek Helper', () => {
    it('executes video seek script when chrome scripting is available', async () => {
      const mockExecuteScript = vi.fn().mockResolvedValue([]);
      (globalThis as unknown as { chrome: unknown }).chrome = {
        tabs: {
          query: vi
            .fn()
            .mockResolvedValue([{ id: 101, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }]),
        },
        scripting: {
          executeScript: mockExecuteScript,
        },
      };

      const success = await seekVideoInTab(90);
      expect(success).toBe(true);
      expect(mockExecuteScript).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { tabId: 101 },
          args: [90],
        })
      );
    });
  });
});
