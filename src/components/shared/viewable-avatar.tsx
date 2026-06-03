'use client';

import * as React from 'react';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { useAvatarViewer } from '@/contexts/AvatarViewerContext';
import { cn } from '@/lib/utils';

/**
 * Drop-in avatar that opens the full-image viewer when clicked (only when it has a
 * real image — fallback initials are not clickable). Pass the fallback element as
 * `fallback`. Mirrors the <Avatar> sizing API via `className`.
 */
export function ViewableAvatar({
  src, name, fallback, className, imgClassName,
}: {
  src?: string | null;
  name?: string | null;
  fallback: React.ReactNode;
  className?: string;
  imgClassName?: string;
}) {
  const { open } = useAvatarViewer();
  const clickable = !!src;

  const interactive = clickable
    ? {
        role: 'button' as const,
        tabIndex: 0,
        'aria-label': name ? `View ${name}'s photo` : 'View photo',
        onClick: () => open(src as string, name ?? undefined),
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open(src as string, name ?? undefined);
          }
        },
      }
    : {};

  return (
    <Avatar className={cn(clickable && 'cursor-zoom-in', className)} {...interactive}>
      {src && <AvatarImage src={src} alt={name ?? ''} className={imgClassName} />}
      {fallback}
    </Avatar>
  );
}
