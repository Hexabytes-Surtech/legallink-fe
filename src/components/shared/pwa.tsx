'use client';

import * as React from 'react';
import { Download, Share, Plus, X } from 'lucide-react';
import { usePwaInstall } from '@/contexts/PwaInstallContext';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'll_pwa_dismissed';

/**
 * Single mount point for PWA behaviour: registers the service worker and shows a
 * tasteful, dismissible "Install app" prompt (native flow on Android/Chrome,
 * Add-to-Home-Screen instructions on iOS). Renders nothing once installed.
 */
export function Pwa() {
  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => { /* SW registration is best-effort */ });
    };
    if (document.readyState === 'complete') register();
    else {
      window.addEventListener('load', register, { once: true });
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return <InstallPrompt />;
}

function InstallPrompt() {
  const { isIOS, installable, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    try { setDismissed(!!localStorage.getItem(DISMISS_KEY)); } catch { setDismissed(false); }
  }, []);

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  }

  async function install() {
    await promptInstall();
    setDismissed(true);
  }

  if (dismissed || !installable) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-sm rounded-2xl border border-border p-4 shadow-lift',
        'glass-strong duration-300 animate-in fade-in slide-in-from-bottom-4 sm:left-auto sm:right-4 sm:mx-0',
      )}
      role="dialog"
      aria-label="Install LegalLink"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="LegalLink" className="size-12 shrink-0 rounded-xl shadow-soft" />
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold">Install LegalLink</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {isIOS
              ? 'Add LegalLink to your Home Screen for an app-like experience.'
              : 'Install the app for quick access, full-screen, and offline support.'}
          </p>
        </div>
      </div>

      {isIOS ? (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Tap <Share className="inline size-3.5 text-info" /> <span className="font-medium text-foreground">Share</span>
          , then <Plus className="inline size-3.5 text-info" /> <span className="font-medium text-foreground">Add to Home Screen</span>.
        </p>
      ) : (
        <button
          type="button"
          onClick={install}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-transform active:scale-95"
        >
          <Download className="size-4" /> Install app
        </button>
      )}
    </div>
  );
}
