import React from 'react';
import { ExtractedArticle } from '../types/article.types';
import { ExternalLink, User, Calendar, Globe, Clock } from 'lucide-react';
import Badge from '@/components/common/Badge';

export interface ArticleMetadataProps {
  article: ExtractedArticle;
}

export const ArticleMetadata: React.FC<ArticleMetadataProps> = ({ article }) => {
  const estimatedReadingTime = Math.max(1, Math.round(article.wordCount / 200));

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200/90 bg-white p-3.5 text-left shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
          {article.title}
        </h2>
        {article.url && (
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            title="Open original page in new tab"
            className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 shrink-0 mt-0.5"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
        {article.siteName && (
          <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
            <Globe className="h-3 w-3 text-slate-400" />
            <span>{article.siteName}</span>
          </span>
        )}

        {article.byline && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3 text-slate-400" />
            <span>{article.byline}</span>
          </span>
        )}

        {article.publishedTime && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-slate-400" />
            <span>{article.publishedTime.slice(0, 10)}</span>
          </span>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          <Badge variant="neutral" size="sm" className="font-normal">
            <Clock className="h-2.5 w-2.5 mr-0.5" />
            {estimatedReadingTime} min read ({article.wordCount} words)
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default ArticleMetadata;
