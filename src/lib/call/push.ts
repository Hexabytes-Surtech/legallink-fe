// Web Push subscription helpers for incoming-call notifications. The service worker
// (public/sw.js) handles the actual `push` / `notificationclick` events; this module
// is the page-side counterpart: request permission, (un)subscribe, and sync the
// subscription with the backend.

import { api } from '@/lib/api/client';

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/** VAPID public keys are base64url; the Push API wants a Uint8Array. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/**
 * Create (or reuse) the push subscription and save it to the backend. Assumes
 * permission is already granted — used by enableCallPush() and by the silent
 * re-subscribe on app load. Returns true on success.
 */
export async function registerPushSubscription(): Promise<boolean> {
  const reg = await getRegistration();
  if (!reg) return false;
  try {
    let key = '';
    try {
      const res = await api.get<{ publicKey: string; enabled: boolean }>('/push/vapid-public-key');
      if (!res?.enabled || !res?.publicKey) return false;
      key = res.publicKey;
    } catch {
      return false; // backend push disabled / unreachable
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
    }

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys) return false;
    await api.post<{ ok: boolean }>('/push/subscribe', {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Request notification permission (MUST be called from a user gesture) and
 * subscribe this device. Returns a coarse status for the UI to react to.
 */
export async function enableCallPush(): Promise<'granted' | 'denied' | 'unsupported' | 'error'> {
  if (!isPushSupported()) return 'unsupported';
  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch {
    return 'error';
  }
  if (permission !== 'granted') return 'denied';
  const ok = await registerPushSubscription();
  return ok ? 'granted' : 'error';
}

/** Remove this device's subscription (backend + browser). */
export async function disableCallPush(): Promise<void> {
  const reg = await getRegistration();
  if (!reg) return;
  try {
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await api.post<{ ok: boolean }>('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  } catch {
    /* ignore */
  }
}
