'use client';

import * as React from 'react';
import { Bell, BellOff, Volume2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { usePwaInstall } from '@/contexts/PwaInstallContext';
import {
  isPushSupported,
  notificationPermission,
  enableCallPush,
  disableCallPush,
} from '@/lib/call/push';

const SOUND_KEY = 'll_call_sound';

/** Settings card: ringtone sound + incoming-call push notifications. */
export function CallAlertsSettings() {
  const { isIOS, isStandalone } = usePwaInstall();

  const [soundOn, setSoundOn] = React.useState(true);
  const [pushOn, setPushOn] = React.useState(false);
  const [permission, setPermission] = React.useState<NotificationPermission | 'unsupported'>('default');
  const [supported, setSupported] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  /*
   * One-time read of browser-only state on mount (localStorage + Notification
   * permission + any existing subscription). This is the SSR-safe pattern — render
   * safe defaults, then sync after hydration — so set-state-in-effect is disabled
   * here on purpose (same approach as the existing PWA install prompt).
   */
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    setSupported(isPushSupported());
    setPermission(notificationPermission());
    try {
      setSoundOn(localStorage.getItem(SOUND_KEY) !== 'off');
    } catch {
      /* ignore */
    }
    void (async () => {
      if (!isPushSupported() || notificationPermission() !== 'granted') return;
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setPushOn(!!sub);
      } catch {
        /* ignore */
      }
    })();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function toggleSound(next: boolean) {
    setSoundOn(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
    } catch {
      /* ignore */
    }
  }

  async function togglePush(next: boolean) {
    setBusy(true);
    try {
      if (next) {
        const res = await enableCallPush();
        if (res === 'granted') {
          setPushOn(true);
          setPermission('granted');
          toast.success('Call alerts enabled.');
        } else if (res === 'denied') {
          setPushOn(false);
          setPermission(notificationPermission());
          toast.error('Notification permission was blocked.');
        } else if (res === 'unsupported') {
          toast.error('Push notifications are not supported on this browser.');
        } else {
          toast.error('Could not enable call alerts. Please try again.');
        }
      } else {
        await disableCallPush();
        setPushOn(false);
        toast('Call alerts disabled.');
      }
    } finally {
      setBusy(false);
    }
  }

  const iosNeedsInstall = isIOS && !isStandalone;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold">Call alerts</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Ring and notify me about incoming voice &amp; video calls.
      </p>

      <div className="mt-5 space-y-4">
        {/* Ringtone */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Volume2 className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Ringtone</p>
              <p className="text-xs text-muted-foreground">
                Play a ring sound while a call comes in (when the app is open).
              </p>
            </div>
          </div>
          <Switch checked={soundOn} onCheckedChange={toggleSound} aria-label="Ringtone" />
        </div>

        {/* Push notifications */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              {pushOn ? (
                <Bell className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              ) : (
                <BellOff className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium">Call notifications</p>
                <p className="text-xs text-muted-foreground">
                  Get notified about calls even when LegalLink is closed.
                </p>
              </div>
            </div>
            <Switch
              checked={pushOn}
              onCheckedChange={togglePush}
              disabled={busy || !supported || iosNeedsInstall || permission === 'denied'}
              aria-label="Call notifications"
            />
          </div>

          {!supported && (
            <p className="mt-2 pl-8 text-xs text-warning">
              This browser does not support push notifications.
            </p>
          )}
          {supported && iosNeedsInstall && (
            <p className="mt-2 flex items-start gap-1.5 pl-8 text-xs text-muted-foreground">
              <Smartphone className="mt-0.5 size-3.5 shrink-0" />
              On iPhone or iPad, add LegalLink to your Home Screen first (Share → Add to Home
              Screen), then enable this.
            </p>
          )}
          {supported && !iosNeedsInstall && permission === 'denied' && (
            <p className="mt-2 pl-8 text-xs text-destructive">
              Notifications are blocked. Allow them in your browser site settings, then try again.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
