'use client';

import { Scale } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import type { Citation } from '@/types';
import { cn } from '@/lib/utils';

/**
 * A grounded statute citation. The chip shows source + section; hover reveals
 * the cited text. Tolerant of the flat backend shape and the legacy mock shape.
 */
export function CitationChip({ citation, className }: { citation: Citation; className?: string }) {
  const heading =
    citation.citation ||
    [citation.source, citation.section].filter(Boolean).join(' · ') ||
    citation.title;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex max-w-full cursor-default items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-left',
              className,
            )}
          >
            <Scale className="size-4 shrink-0 text-gold" />
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-foreground">{heading}</span>
              {citation.title && citation.title !== heading && (
                <span className="block truncate text-[11px] text-muted-foreground">{citation.title}</span>
              )}
            </span>
          </span>
        </TooltipTrigger>
        {citation.text && (
          <TooltipContent className="max-w-xs text-pretty leading-relaxed">{citation.text}</TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
