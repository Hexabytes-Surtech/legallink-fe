'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Shared avatar-upload helper used by the citizen sidebar header (pencil) and the
 * profile/settings editor. Owns a hidden <input type=file>; `openPicker()` opens it
 * and the change handler uploads to `POST /user/avatar`.
 *
 * IMPORTANT: the backend interceptor is `FileInterceptor('avatar')`, so the multipart
 * field MUST be named `avatar` (an earlier version sent `file`, which silently failed).
 */
export function useAvatarUpload(onUploaded?: (url: string) => void) {
  const { updateUser } = useAuth();
  const { t } = useLanguage();
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const openPicker = React.useCallback(() => inputRef.current?.click(), []);

  const onChange = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('avatar', file);
        const res = await api.upload<{ avatar_url: string }>('/user/avatar', fd);
        updateUser({ avatar_url: res.avatar_url });
        onUploaded?.(res.avatar_url);
        toast.success(t('settings.uploaded'));
      } catch (err) {
        toast.error(err instanceof ApiError ? err.first : t('shared.error'));
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [updateUser, onUploaded, t],
  );

  return { uploading, openPicker, inputRef, onChange };
}
