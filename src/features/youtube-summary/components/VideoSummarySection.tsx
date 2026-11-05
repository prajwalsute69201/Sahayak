import React from 'react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import { ImportantMoment } from '../types/youtube.types';
import { Play } from 'lucide-react';

interface VideoSummarySectionProps {
  title: string;
  icon: React.ReactNode;
  badge?: string;
  children?: React.ReactNode;
  moments?: ImportantMoment[];
  onSeek?: (seconds: number) => void;
  className?: string;
}

export const VideoSummarySection: React.FC<VideoSummarySectionProps> = ({
  title,
  icon,
  badge,
  children,
  moments,
  onSeek,
  className = '',
}) => {
  return (
    <Card className={`p-3.5 text-left transition-all ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            {icon}
          </div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            {title}
          </h4>
        </div>
        {badge && (
          <Badge variant="primary" size="sm">
            {badge}
          </Badge>
        )}
      </div>

      {/* Standard Content */}
      {children && (
        <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{children}</div>
      )}

      {/* Important Moments with Clickable Timestamp Seek Buttons */}
      {moments && moments.length > 0 && (
        <div className="mt-2 space-y-2">
          {moments.map((moment, index) => (
            <div
              key={index}
              className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/70 p-2 transition-colors hover:border-blue-200 hover:bg-blue-50/40 dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:border-blue-900/50"
            >
              <button
                type="button"
                onClick={() => onSeek && onSeek(moment.seconds)}
                className="group flex shrink-0 items-center gap-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-mono font-bold text-white shadow-xs transition-transform active:scale-95 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 cursor-pointer"
                title={`Seek video to ${moment.timestamp}`}
              >
                <Play className="h-2.5 w-2.5 fill-white" />
                <span>{moment.timestamp}</span>
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {moment.title}
                </p>
                {moment.description && moment.description !== moment.title && (
                  <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {moment.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default VideoSummarySection;
