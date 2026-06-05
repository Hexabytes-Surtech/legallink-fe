'use client';

import * as React from 'react';

// Minimal shape of the (non-standard) beforeinstallprompt event.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type PwaInstallValue = {
  /** Native install prompt is available (Android/Chrome/desktop). */
  canInstall: boolean;
  /** iOS Safari — needs manual "Add to Home Screen". */
  isIOS: boolean;
  /** Already installed / running as an installed app. */
  isStandalone: boolean;
  /** Either an install path exists and we're not already installed. */
  installable: boolean;
  /** Trigger the native prompt. Returns the user's choice (or 'unavailable'). */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
};

const PwaInstallContext = React.createContext<PwaInstallValue | null>(null);

/**
 * Captures the one-shot `beforeinstallprompt` event app-wide so multiple
 * surfaces (the floating prompt + the header menu item) can share it.
 */
export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = React.useState(false);
  const [isStandalone, setIsStandalone] = React.useState(false);

  React.useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream);

    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
    const onInstalled = () => { setDeferred(null); setIsStandalone(true); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = React.useCallback(async () => {
    if (!deferred) return 'unavailable' as const;
    await deferred.prompt();
    let outcome: 'accepted' | 'dismissed' = 'dismissed';
    try { outcome = (await deferred.userChoice).outcome; } catch { /* ignore */ }
    setDeferred(null);
    return outcome;
  }, [deferred]);

  const value = React.useMemo<PwaInstallValue>(() => ({
    canInstall: !!deferred && !isStandalone,
    isIOS,
    isStandalone,
    installable: (!!deferred || isIOS) && !isStandalone,
    promptInstall,
  }), [deferred, isIOS, isStandalone, promptInstall]);

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstall(): PwaInstallValue {
  const ctx = React.useContext(PwaInstallContext);
  if (!ctx) throw new Error('usePwaInstall must be used within PwaInstallProvider');
  return ctx;
}
