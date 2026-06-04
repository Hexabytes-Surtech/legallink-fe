'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/**
 * "View document" button that opens the file (image or PDF) in a glassmorphism modal
 * (translucent, heavily-blurred backdrop — matches the avatar viewer). When `protect`
 * is set (citizen-facing), download deterrents apply: no toolbar, right-click/drag off.
 */
export function ViewDocumentButton({
  url, fileType, name, label, protect = false, variant = 'outline', className,
}: {
  url: string;
  fileType?: string;
  name?: string;
  label?: string;
  protect?: boolean;
  variant?: React.ComponentProps<typeof Button>['variant'];
  className?: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const isImage = (fileType ?? '').toLowerCase().startsWith('image');
  const guard = protect
    ? { onContextMenu: (e: React.MouseEvent) => e.preventDefault(), draggable: false }
    : {};

  return (
    <>
      <Button type="button" variant={variant} size="sm" onClick={() => setOpen(true)} className={className}>
        <FileText className="size-4" /> {label ?? t('doc.view')}
      </Button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-navy/40 backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-[100] flex max-h-[92vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col gap-3 outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95"
          >
            <DialogPrimitive.Title className="sr-only">{name || t('doc.view')}</DialogPrimitive.Title>
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={name || ''}
                className={cn('max-h-[85vh] w-auto self-center rounded-2xl border border-white/15 object-contain shadow-2xl ring-1 ring-white/10', protect && 'select-none')}
                {...guard}
              />
            ) : (
              <iframe
                src={`${url}#toolbar=${protect ? 0 : 1}&navpanes=0`}
                title={name || 'PDF'}
                className="h-[85vh] w-full rounded-2xl border border-white/15 bg-white shadow-2xl"
              />
            )}
            {name && <p className="text-center text-sm font-medium text-white drop-shadow-md">{name}</p>}
            <DialogPrimitive.Close
              aria-label="Close"
              className="absolute -top-2 right-2 grid size-9 place-items-center rounded-full bg-background/70 text-foreground shadow-soft backdrop-blur transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring outline-none sm:-right-12 sm:top-0"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
