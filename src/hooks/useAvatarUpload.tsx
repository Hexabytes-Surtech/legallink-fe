'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { Area } from 'react-easy-crop';
import { api, ApiError } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AvatarCropDialog } from '@/components/features/avatar-crop-dialog';

/**
 * Shared avatar-upload helper used by the citizen/advocate sidebar headers (pencil)
 * and the profile/settings editor. Owns a hidden <input type=file>; `openPicker()`
 * opens it. After a file is chosen the user frames a square crop; the ORIGINAL file
 * plus the crop rectangle are sent to `POST /user/avatar`, which crops on Cloudinary
 * (no client-side re-encode → no quality loss).
 *
 * IMPORTANT: the backend interceptor is `FileInterceptor('avatar')`, so the multipart
 * field MUST be named `avatar`.
 *
 * Consumers render `{cropper}` somewhere in their tree (it is self-contained).
 */
export function useAvatarUpload(onUploaded?: (url: string) => void) {
  const { updateUser } = useAuth();
  const { t } = useLanguage();
  const [uploading, setUploading] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const fileRef = React.useRef<File | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const openPicker = React.useCallback(() => inputRef.current?.click(), []);

  // Picking a file holds the original and opens the crop step (no upload yet).
  const onChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again still fires onChange.
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    fileRef.current = file;
    setCropSrc(URL.createObjectURL(file));
  }, []);

  const closeCrop = React.useCallback(() => {
    fileRef.current = null;
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const onConfirm = React.useCallback(
    async (crop: Area) => {
      const file = fileRef.current;
      if (!file) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('avatar', file); // ORIGINAL, untouched — Cloudinary does the crop
        fd.append('cropX', String(Math.round(crop.x)));
        fd.append('cropY', String(Math.round(crop.y)));
        fd.append('cropWidth', String(Math.round(crop.width)));
        fd.append('cropHeight', String(Math.round(crop.height)));
        const res = await api.upload<{ avatar_url: string }>('/user/avatar', fd);
        updateUser({ avatar_url: res.avatar_url });
        onUploaded?.(res.avatar_url);
        toast.success(t('settings.uploaded'));
        closeCrop();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.first : t('shared.error'));
      } finally {
        setUploading(false);
      }
    },
    [updateUser, onUploaded, t, closeCrop],
  );

  const cropper = (
    <AvatarCropDialog
      src={cropSrc}
      open={!!cropSrc}
      busy={uploading}
      onCancel={closeCrop}
      onConfirm={onConfirm}
    />
  );

  return { uploading, openPicker, inputRef, onChange, cropper };
}
