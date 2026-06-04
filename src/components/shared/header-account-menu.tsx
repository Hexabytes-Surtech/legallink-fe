'use client';

import * as React from 'react';
import Link from 'next/link';
import { LogOut, Eye, Camera, UserRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { useAvatarViewer } from '@/contexts/AvatarViewerContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import type { Role } from '@/types';

// Where each role's "Profile" link goes.
const PROFILE_HREF: Record<Role, string> = {
  citizen: '/profile',
  advocate: '/advocate/profile',
  admin: '/settings',
};

function initials(name: string) {
  return (name || 'U').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');
}

/**
 * Top-right account avatar (in every console header). Click opens a dropdown with the
 * user's name/email, a role-aware "View profile" link, view/update photo, and sign out.
 * Role-agnostic — reads the signed-in user from AuthContext.
 */
export function HeaderAccountMenu() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { open } = useAvatarViewer();
  const { openPicker, inputRef, onChange, cropper } = useAvatarUpload();
  if (!user) return null;

  const name = user.name || user.email?.split('@')[0] || 'Account';
  const href = PROFILE_HREF[user.role] ?? '/profile';
  const hasPhoto = !!user.avatar_url;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t('nav.account')}
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar className="size-8 ring-1 ring-border transition-transform hover:scale-105">
              {user.avatar_url && <AvatarImage src={user.avatar_url} alt={name} />}
              <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="normal-case">
            <p className="truncate font-semibold">{name}</p>
            {user.email && <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={href}><UserRound /> {t('nav.viewProfile')}</Link>
          </DropdownMenuItem>
          {hasPhoto && (
            <DropdownMenuItem onClick={() => open(user.avatar_url as string, name)}>
              <Eye /> {t('avatar.view')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={openPicker}>
            <Camera /> {hasPhoto ? t('avatar.update') : t('avatar.upload')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
            <LogOut /> {t('nav.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden file input + crop dialog that the "Update photo" action drives. */}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onChange} />
      {cropper}
    </>
  );
}
