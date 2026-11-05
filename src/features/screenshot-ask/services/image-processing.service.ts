/**
 * Image Processing Service
 * Validates, dimensions, compresses, and normalizes browser screenshots for Gemini Vision.
 */

import {
  RawScreenshot,
  ProcessedScreenshot,
  ImageValidationResult,
  SupportedImageFormat,
} from '../types/screenshot.types';

export class ImageProcessingService {
  public static readonly MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB hard cap
  public static readonly MAX_SUGGESTED_SIZE_BYTES = 1.5 * 1024 * 1024; // 1.5 MB compression threshold
  public static readonly MAX_DIMENSION = 1600; // 1600px max width or height
  public static readonly COMPRESSION_QUALITY = 0.85; // 85% JPEG quality

  /**
   * Supported MIME types
   */
  public static readonly SUPPORTED_FORMATS: SupportedImageFormat[] = [
    'image/png',
    'image/jpeg',
    'image/webp',
  ];

  /**
   * Validates a data URL or raw base64 image string.
   */
  public validateImageData(dataUrlOrBase64?: string): ImageValidationResult {
    if (!dataUrlOrBase64 || typeof dataUrlOrBase64 !== 'string') {
      return { isValid: false, error: 'No image data provided.' };
    }

    const trimmed = dataUrlOrBase64.trim();
    if (trimmed.length === 0) {
      return { isValid: false, error: 'Image data is empty.' };
    }

    // Check data URL format or plain base64
    let mimeType: SupportedImageFormat = 'image/png';
    let base64 = trimmed;

    if (trimmed.startsWith('data:')) {
      const match = trimmed.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (!match) {
        return { isValid: false, error: 'Invalid data URL format for image.' };
      }

      const detectedMime = match[1].toLowerCase() as SupportedImageFormat;
      if (!ImageProcessingService.SUPPORTED_FORMATS.includes(detectedMime)) {
        return {
          isValid: false,
          error: `Unsupported image format (${detectedMime}). Only PNG, JPEG, and WebP are supported.`,
        };
      }

      mimeType = detectedMime;
      base64 = match[2];
    }

    // Approximate byte size from base64 length
    const sizeBytes = Math.floor((base64.length * 3) / 4);
    if (sizeBytes > ImageProcessingService.MAX_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        sizeBytes,
        error: `Screenshot exceeds maximum allowed size of 10 MB (${Math.round(sizeBytes / (1024 * 1024))} MB).`,
      };
    }

    return {
      isValid: true,
      mimeType,
      sizeBytes,
    };
  }

  /**
   * Strips data URL prefix to return clean base64 payload.
   */
  public extractCleanBase64(dataUrl: string): { base64: string; mimeType: SupportedImageFormat } {
    const trimmed = dataUrl.trim();
    if (trimmed.startsWith('data:')) {
      const match = trimmed.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        return {
          mimeType: match[1].toLowerCase() as SupportedImageFormat,
          base64: match[2].trim(),
        };
      }
    }

    return {
      mimeType: 'image/png',
      base64: trimmed,
    };
  }

  /**
   * Resolves image dimensions (width & height).
   */
  public async getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      return { width: 1280, height: 720 };
    }

    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          resolve({
            width: img.naturalWidth || img.width || 1280,
            height: img.naturalHeight || img.height || 720,
          });
        };
        img.onerror = () => {
          resolve({ width: 1280, height: 720 });
        };
        img.src = dataUrl;
      } catch {
        resolve({ width: 1280, height: 720 });
      }
    });
  }

  /**
   * Processes, resizes, and optionally compresses a raw screenshot.
   * If the screenshot is already within dimension & size limits, preserves original quality.
   */
  public async processScreenshot(raw: RawScreenshot): Promise<ProcessedScreenshot> {
    // 1. Validation check
    const validation = this.validateImageData(raw.dataUrl);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid screenshot image data.');
    }

    const { base64, mimeType } = this.extractCleanBase64(raw.dataUrl);
    const originalSizeBytes = validation.sizeBytes || Math.floor((base64.length * 3) / 4);

    // 2. Determine dimensions
    const { width, height } = await this.getImageDimensions(raw.dataUrl);

    // 3. Determine if scaling or compression is needed
    const exceedsDimensions =
      width > ImageProcessingService.MAX_DIMENSION || height > ImageProcessingService.MAX_DIMENSION;
    const exceedsSize = originalSizeBytes > ImageProcessingService.MAX_SUGGESTED_SIZE_BYTES;

    // If within limits and environment is standard, avoid re-encoding
    if (!exceedsDimensions && !exceedsSize) {
      return {
        dataUrl: raw.dataUrl,
        base64Data: base64,
        mimeType,
        width,
        height,
        originalSizeBytes,
        processedSizeBytes: originalSizeBytes,
        isCompressed: false,
        pageTitle: raw.pageTitle,
        pageUrl: raw.pageUrl,
        timestamp: raw.timestamp || Date.now(),
      };
    }

    // 4. Calculate aspect-ratio-preserved target dimensions
    let targetWidth = width;
    let targetHeight = height;

    if (exceedsDimensions) {
      const scale = Math.min(
        ImageProcessingService.MAX_DIMENSION / width,
        ImageProcessingService.MAX_DIMENSION / height
      );
      targetWidth = Math.max(1, Math.round(width * scale));
      targetHeight = Math.max(1, Math.round(height * scale));
    }

    // 5. Compress using canvas if supported in environment
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          const img = await this.loadImageElement(raw.dataUrl);
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Convert to JPEG for efficient payload compression
          const compressedDataUrl = canvas.toDataURL(
            'image/jpeg',
            ImageProcessingService.COMPRESSION_QUALITY
          );
          const compressedClean = this.extractCleanBase64(compressedDataUrl);
          const processedSizeBytes = Math.floor((compressedClean.base64.length * 3) / 4);

          return {
            dataUrl: compressedDataUrl,
            base64Data: compressedClean.base64,
            mimeType: 'image/jpeg',
            width: targetWidth,
            height: targetHeight,
            originalSizeBytes,
            processedSizeBytes,
            isCompressed: true,
            pageTitle: raw.pageTitle,
            pageUrl: raw.pageUrl,
            timestamp: raw.timestamp || Date.now(),
          };
        }
      } catch (canvasErr) {
        console.warn('[Sahayak Vision] Canvas compression fallback:', canvasErr);
      }
    }

    // Fallback if canvas is not available or errored
    return {
      dataUrl: raw.dataUrl,
      base64Data: base64,
      mimeType,
      width: targetWidth,
      height: targetHeight,
      originalSizeBytes,
      processedSizeBytes: originalSizeBytes,
      isCompressed: false,
      pageTitle: raw.pageTitle,
      pageUrl: raw.pageUrl,
      timestamp: raw.timestamp || Date.now(),
    };
  }

  /**
   * Helper to load an Image element asynchronously.
   */
  private loadImageElement(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  }
}

export const imageProcessingService = new ImageProcessingService();
export default imageProcessingService;
