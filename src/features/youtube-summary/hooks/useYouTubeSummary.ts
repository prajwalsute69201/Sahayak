/**
 * useYouTubeSummary Hook
 * Manages video detection, metadata extraction, transcript fetching, AI summarization, and timestamp seeking.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  YouTubeSummaryStatus,
  YouTubeVideoMetadata,
  TranscriptSegment,
  YouTubeStructuredSummary,
} from '../types/youtube.types';
import { parseYouTubeUrl } from '../services/youtube-detector.service';
import { resolveYouTubeMetadata } from '../services/youtube-metadata.service';
import { retrieveYouTubeTranscript } from '../services/transcript.service';
import { generateYouTubeSummary, seekVideoInTab } from '../services/youtube-summary.service';
import { useSettingsStore } from '@/store/useSettingsStore';
import { LanguagePreference } from '@/types/settings.types';

export function useYouTubeSummary() {
  const { settings } = useSettingsStore();

  const [status, setStatus] = useState<YouTubeSummaryStatus>('idle');
  const [metadata, setMetadata] = useState<YouTubeVideoMetadata | null>(null);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[] | null>(null);
  const [summary, setSummary] = useState<YouTubeStructuredSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isYouTubePage, setIsYouTubePage] = useState<boolean>(false);
  const [activeTabUrl, setActiveTabUrl] = useState<string>('');

  /**
   * Probes active browser tab for YouTube video URL.
   */
  const detectActiveTab = useCallback(async () => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab?.url || '';
      setActiveTabUrl(url);

      const parsed = parseYouTubeUrl(url);
      if (parsed.isValid && parsed.videoId) {
        setIsYouTubePage(true);
        // Pre-fetch basic metadata if idle
        if (status === 'idle' && !metadata) {
          const resolved = await resolveYouTubeMetadata(url);
          if (resolved) {
            setMetadata(resolved);
          }
        }
      } else {
        setIsYouTubePage(false);
      }
    } catch (err) {
      console.warn('[Sahayak] Failed to detect active tab:', err);
      setIsYouTubePage(false);
    }
  }, [status, metadata]);

  // Initial detection and tab synchronization
  useEffect(() => {
    detectActiveTab();

    if (typeof chrome !== 'undefined' && chrome.tabs?.onActivated) {
      const handleTabActivated = () => detectActiveTab();
      const handleTabUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (changeInfo.url || changeInfo.status === 'complete') {
          detectActiveTab();
        }
      };

      chrome.tabs.onActivated.addListener(handleTabActivated);
      chrome.tabs.onUpdated.addListener(handleTabUpdated);

      return () => {
        chrome.tabs.onActivated.removeListener(handleTabActivated);
        chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      };
    }
  }, [detectActiveTab]);

  /**
   * Executes the full pipeline: Metadata -> Transcript -> Gemini Summary
   */
  const summarizeVideo = useCallback(
    async (targetUrl?: string, overrideLanguage?: LanguagePreference) => {
      setError(null);

      // Validate API Key
      if (!settings.geminiApiKey?.trim()) {
        setStatus('error');
        setError(
          'Gemini API key is required. Please configure your key in Settings before summarizing.'
        );
        return;
      }

      // Determine URL to summarize
      let urlToUse = targetUrl || activeTabUrl;
      if (!urlToUse && typeof chrome !== 'undefined' && chrome.tabs?.query) {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          urlToUse = tab?.url || '';
        } catch {
          // ignore
        }
      }

      const parsed = parseYouTubeUrl(urlToUse);
      if (!parsed.isValid || !parsed.videoId) {
        setStatus('error');
        setError(
          'No supported YouTube video detected. Please open a YouTube video or provide a valid YouTube URL.'
        );
        return;
      }

      try {
        // Step 1: Metadata Extraction
        setStatus('extracting_metadata');
        const resolvedMeta = await resolveYouTubeMetadata(parsed.cleanWatchUrl!);
        if (!resolvedMeta) {
          throw new Error('Could not resolve video metadata.');
        }
        setMetadata(resolvedMeta);

        // Step 2: Transcript Retrieval
        setStatus('extracting_transcript');
        const effectiveLang = overrideLanguage || settings.language || 'en';
        const transcriptResult = await retrieveYouTubeTranscript(
          resolvedMeta.videoId,
          effectiveLang === 'auto' ? 'en' : effectiveLang
        );

        if (
          !transcriptResult.success ||
          !transcriptResult.segments ||
          transcriptResult.segments.length === 0
        ) {
          setStatus('error');
          setError(
            transcriptResult.errorMessage ||
              'No captions or transcripts are available for this video. The creator may have disabled subtitles, or captions are still processing.'
          );
          return;
        }

        setTranscriptSegments(transcriptResult.segments);

        // Step 3: Summarization with Gemini Flash-Lite
        setStatus('summarizing');
        const generatedSummary = await generateYouTubeSummary(
          resolvedMeta,
          transcriptResult.segments,
          effectiveLang
        );

        setSummary(generatedSummary);
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setError(
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while summarizing the video.'
        );
      }
    },
    [activeTabUrl, settings.geminiApiKey, settings.language]
  );

  /**
   * Seeks the active tab video to the given seconds
   */
  const seekTo = useCallback(async (seconds: number) => {
    await seekVideoInTab(seconds);
  }, []);

  const retry = useCallback(() => {
    summarizeVideo();
  }, [summarizeVideo]);

  const reset = useCallback(() => {
    setStatus('idle');
    setSummary(null);
    setTranscriptSegments(null);
    setError(null);
  }, []);

  return {
    status,
    metadata,
    transcriptSegments,
    summary,
    error,
    isYouTubePage,
    activeTabUrl,
    summarizeVideo,
    seekTo,
    retry,
    reset,
    detectActiveTab,
  };
}
