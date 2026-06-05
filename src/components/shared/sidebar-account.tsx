'use client';

import * as React from 'react';
import Link from 'next/link';
import { LogOut, Settings, MoreVertical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { AvatarFallback } from '@/components/ui/avatar';
import { AvatarMenu } from '@/components/shared/avatar-menu';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

function initials(name: string) {
  return (name || 'U').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');
}

/**
 * Account block for the bottom of a console sidebar: the user's avatar (click to view /
 * update / upload the photo), their name + a secondary line, and a "⋮" menu with the
 * role's profile link and sign-out. Collapses to just the avatar in icon mode.
 */
export function SidebarAccount({
  avatarUrl, name, secondary, nameAdornment, profileHref, profileLabel, editable = true,
}: {
  avatarUrl?: string | null;
  name: string;
  secondary?: React.ReactNode;
  /** Rendered inline, right after the name (e.g. a verification symbol). */
  nameAdornment?: React.ReactNode;
  profileHref: string;
  profileLabel: string;
  editable?: boolean;
}) {
  const { t } = useLanguage();
  const { logout } = useAuth();
  const { openPicker, inputRef, onChange, cropper } = useAvatarUpload();

  return (
    <div className="flex items-center gap-2 rounded-lg p-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
      <AvatarMenu
        src={avatarUrl}
        name={name}
        editable={editable}
        onEdit={openPicker}
        className="size-9 shrink-0 ring-1 ring-border"
        fallback={<AvatarFallback>{initials(name)}</AvatarFallback>}
      />
      {editable && <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onChange} />}

      <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold">{name}</p>
          {nameAdornment && <span className="shrink-0">{nameAdornment}</span>}
        </div>
        {secondary}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 shrink-0 group-data-[collapsible=icon]:hidden" aria-label={t('nav.account')}>
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-48">
          <DropdownMenuLabel className="truncate normal-case">{name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={profileHref}><Settings /> {profileLabel}</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
            <LogOut /> {t('nav.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {cropper}
    </div>
  );
}
