import React from 'react';
import { YouTubeVideoMetadata } from '../types/youtube.types';
import Badge from '@/components/common/Badge';
import { Youtube, Clock, User, ExternalLink } from 'lucide-react';

interface YouTubeVideoInfoProps {
  metadata: YouTubeVideoMetadata;
  className?: string;
}

export const YouTubeVideoInfo: React.FC<YouTubeVideoInfoProps> = ({ metadata, className = '' }) => {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div className="flex gap-3">
        {/* Video Thumbnail */}
        <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
          <img
            src={metadata.thumbnailUrl}
            alt={metadata.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              // Fallback to default thumbnail if maxres fails
              const target = e.currentTarget;
              if (!target.src.includes('hqdefault.jpg')) {
                target.src = `https://i.ytimg.com/vi/${metadata.videoId}/hqdefault.jpg`;
              }
            }}
          />
          {metadata.durationFormatted && (
            <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
              {metadata.durationFormatted}
            </span>
          )}
          {metadata.isShort && (
            <span className="absolute top-1 left-1 rounded bg-red-600 px-1 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
              Short
            </span>
          )}
        </div>

        {/* Video Details */}
        <div className="flex flex-1 flex-col justify-between min-w-0">
          <div>
            <h3
              className="line-clamp-2 text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug"
              title={metadata.title}
            >
              {metadata.title}
            </h3>

            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{metadata.channelName}</span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Badge
                variant="neutral"
                size="sm"
                className="bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300"
              >
                <Youtube className="h-2.5 w-2.5 mr-0.5" />
                YouTube
              </Badge>
              {metadata.durationFormatted && (
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Clock className="h-2.5 w-2.5" />
                  {metadata.durationFormatted}
                </span>
              )}
            </div>

            <a
              href={metadata.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-0.5"
            >
              Watch <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YouTubeVideoInfo;
