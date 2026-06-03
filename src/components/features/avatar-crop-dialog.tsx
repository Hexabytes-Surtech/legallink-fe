'use client';

import * as React from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Loader2, ZoomIn } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Square/round crop step shown after the user picks an image. It only reports the
 * selected crop RECTANGLE (in the original image's pixel coordinates) — the actual
 * crop is done on Cloudinary from the pristine original, so there is no quality loss
 * from a client-side canvas re-encode.
 */
export function AvatarCropDialog({
  src, open, busy, onCancel, onConfirm,
}: {
  src: string | null;
  open: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (crop: Area) => void | Promise<void>;
}) {
  const { t } = useLanguage();
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [areaPixels, setAreaPixels] = React.useState<Area | null>(null);
  const [working, setWorking] = React.useState(false);

  // Reset the framing whenever a new image is opened.
  React.useEffect(() => {
    if (open) { setCrop({ x: 0, y: 0 }); setZoom(1); setAreaPixels(null); }
  }, [src, open]);

  const onCropComplete = React.useCallback((_: Area, px: Area) => setAreaPixels(px), []);

  const disabled = working || !!busy;

  async function handleSave() {
    if (!areaPixels) return;
    setWorking(true);
    try {
      await onConfirm(areaPixels);
    } catch {
      // Upload errors are surfaced by the caller's toast; nothing else to do here.
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !disabled) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('avatar.crop.title')}</DialogTitle>
          <DialogDescription>{t('avatar.crop.hint')}</DialogDescription>
        </DialogHeader>

        <div className="relative h-64 w-full overflow-hidden rounded-xl bg-muted">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-gold"
            aria-label={t('avatar.crop.zoom')}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={disabled}>
            {t('shared.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={disabled || !areaPixels}>
            {disabled ? <Loader2 className="size-4 animate-spin" /> : null}
            {t('avatar.crop.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
