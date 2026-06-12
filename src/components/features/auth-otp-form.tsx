'use client';

import * as React from 'react';
import { Mail, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpInput } from '@/components/features/otp-input';
import type { VerifyOtpResponse } from '@/types';
import { cn } from '@/lib/utils';

export type AuthMode = 'login' | 'signup' | 'advocate-signup';

const RESEND_COOLDOWN = 30;

export function AuthOtpForm({
  mode,
  redirectTo,
  onAuthenticated,
  className,
}: {
  mode: AuthMode;
  /** Passed to AuthContext.login. Use `false` to authenticate without navigating. */
  redirectTo?: string | false;
  /** Called after a successful verify (the session is already set). */
  onAuthenticated?: (user: VerifyOtpResponse['user']) => void | Promise<void>;
  className?: string;
}) {
  const { t } = useLanguage();
  const { login } = useAuth();

  const [step, setStep] = React.useState<'email' | 'otp'>('email');
  const [email, setEmail] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Auto-verify the moment all six digits are in — no need to hunt for the button.
  const autoSubmitted = React.useRef(false);
  React.useEffect(() => {
    if (otp.length < 6) { autoSubmitted.current = false; return; }
    if (step === 'otp' && !busy && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void verify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step, busy]);

  const role = mode === 'advocate-signup' ? 'advocate' : 'citizen';

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError(t('auth.error.email'));
      return;
    }
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await api.post('/auth/login', { email: value }, { skipAuth: true });
      } else {
        await api.post('/auth/register', { email: value, role }, { skipAuth: true });
      }
      setEmail(value);
      setStep('otp');
      setCooldown(RESEND_COOLDOWN);
      toast.success(t('auth.step2.subtitle') + ' ' + value);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 404) setError('No account found for this email. Create one instead.');
        else if (err.code === 403) setError('This email isn’t verified yet — check your inbox for the code.');
        else if (err.code === 429) setError(t('auth.lockout'));
        else setError(err.first);
      } else setError(t('intake.error.generic'));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e?: React.FormEvent) {
    e?.preventDefault();
    if (otp.trim().length !== 6) {
      setError(t('auth.error.invalid'));
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await api.post<VerifyOtpResponse>('/auth/verify-otp', { email, otp: otp.trim() }, { skipAuth: true });
      login({ accessToken: res.accessToken, user: { ...res.user } }, onAuthenticated ? false : redirectTo);
      toast.success(t('auth.success'));
      await onAuthenticated?.(res.user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.code === 429 ? t('auth.lockout') : t('auth.error.invalid'));
      } else setError(t('intake.error.generic'));
      setBusy(false);
    }
  }

  return (
    <div className={cn('w-full', className)}>
      {step === 'email' ? (
        <form key="email" onSubmit={sendCode} className="space-y-4 duration-300 animate-in fade-in slide-in-from-bottom-2">
          <div className="space-y-2">
            <Label htmlFor="auth-email">{t('auth.step1.label')}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder={t('auth.step1.placeholder')}
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                className="pl-9"
                aria-invalid={!!error}
              />
            </div>
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {busy ? <><Loader2 className="size-4 animate-spin" />{t('auth.step1.sending')}</> : t('auth.step1.submit')}
          </Button>
        </form>
      ) : (
        <form key="otp" onSubmit={verify} className="space-y-4 duration-300 animate-in fade-in slide-in-from-right-3">
          <button type="button" onClick={() => { setStep('email'); setOtp(''); setError(''); }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> {email}
          </button>
          <div className="space-y-3">
            <Label htmlFor="auth-otp" className="block text-center">{t('auth.step2.title')}</Label>
            <OtpInput
              value={otp}
              onChange={(next) => { setOtp(next); if (error) setError(''); }}
              autoFocus
              disabled={busy}
              hasError={!!error}
            />
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={busy || otp.length !== 6}>
            {busy ? <><Loader2 className="size-4 animate-spin" />{t('auth.step2.verifying')}</> : <><ShieldCheck className="size-4" />{t('auth.step2.submit')}</>}
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            {cooldown > 0 ? (
              <span>{t('auth.step2.resend.wait')} {cooldown}s</span>
            ) : (
              <button type="button" onClick={() => sendCode()} className="font-medium text-primary hover:underline">
                {t('auth.step2.resend')}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
