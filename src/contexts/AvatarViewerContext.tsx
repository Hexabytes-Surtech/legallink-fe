'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface ViewerState { src: string; name?: string }
interface AvatarViewerValue { open: (src: string, name?: string) => void }

const AvatarViewerContext = React.createContext<AvatarViewerValue | null>(null);

/**
 * App-wide "click an avatar to enlarge it" viewer. Renders a single glassmorphism
 * modal (translucent, heavily blurred backdrop) that any avatar can open via
 * `useAvatarViewer().open(url, name)`.
 */
export function AvatarViewerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ViewerState | null>(null);
  const open = React.useCallback((src: string, name?: string) => setState({ src, name }), []);
  const close = React.useCallback(() => setState(null), []);

  return (
    <AvatarViewerContext.Provider value={{ open }}>
      {children}
      <DialogPrimitive.Root open={!!state} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className="fixed inset-0 z-[100] bg-navy/40 backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-[100] flex max-h-[90vh] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4 outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95"
          >
            <DialogPrimitive.Title className="sr-only">{state?.name || 'Profile photo'}</DialogPrimitive.Title>
            {state && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.src}
                alt={state.name || ''}
                className="max-h-[78vh] w-auto rounded-2xl border border-white/15 object-contain shadow-2xl ring-1 ring-white/10"
              />
            )}
            {state?.name && (
              <p className="text-sm font-medium text-white drop-shadow-md">{state.name}</p>
            )}
            <DialogPrimitive.Close
              aria-label="Close"
              className="absolute -top-2 right-2 grid size-9 place-items-center rounded-full bg-background/70 text-foreground shadow-soft backdrop-blur transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring outline-none sm:-right-12 sm:top-0"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </AvatarViewerContext.Provider>
  );
}

export function useAvatarViewer(): AvatarViewerValue {
  const ctx = React.useContext(AvatarViewerContext);
  if (!ctx) throw new Error('useAvatarViewer must be used within AvatarViewerProvider');
  return ctx;
}
