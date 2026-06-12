'use client';

import * as React from 'react';
import { Eye, Pencil } from 'lucide-react';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useAvatarViewer } from '@/contexts/AvatarViewerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/**
 * Clickable avatar whose tap reveals context-aware actions, so the view + edit
 * affordances don't have to fight for space on top of a tiny circle.
 *
 *  - has photo  + editable → menu: View photo / Update photo
 *  - has photo  + view-only → click opens the viewer directly
 *  - no photo   + editable → click opens the file picker (upload)
 *  - no photo   + view-only → plain, non-interactive avatar
 */
export function AvatarMenu({
  src, name, fallback, editable, onEdit, className,
}: {
  src?: string | null;
  name?: string | null;
  fallback: React.ReactNode;
  editable?: boolean;
  onEdit?: () => void;
  className?: string;
}) {
  const { open } = useAvatarViewer();
  const { t } = useLanguage();
  const hasImage = !!src;

  const avatar = (clickable: boolean) => (
    <Avatar className={cn(clickable && 'cursor-pointer', className)}>
      {src && <AvatarImage src={src} alt={name ?? ''} />}
      {fallback}
    </Avatar>
  );

  const triggerBtnClass = 'rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring';

  // Both actions available → a small menu.
  if (hasImage && editable) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={t('settings.avatar')} className={triggerBtnClass}>
            {avatar(true)}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => open(src as string, name ?? undefined)}>
            <Eye /> {t('avatar.view')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}>
            <Pencil /> {t('avatar.update')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Only one action → do it on click, no menu.
  if (hasImage) {
    return (
      <button
        type="button"
        onClick={() => open(src as string, name ?? undefined)}
        aria-label={t('avatar.view')}
        className={triggerBtnClass}
      >
        {avatar(true)}
      </button>
    );
  }
  if (editable) {
    return (
      <button type="button" onClick={onEdit} aria-label={t('avatar.upload')} className={triggerBtnClass}>
        {avatar(true)}
      </button>
    );
  }
  return avatar(false);
}
