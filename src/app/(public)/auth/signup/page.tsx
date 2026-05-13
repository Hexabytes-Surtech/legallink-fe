'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';
import { LanguageToggle } from '@/components/features/LanguageToggle';

function SignupContent() {
  const { t, language } = useLanguage();
  const { isAuthenticated, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') ?? '/matters';

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (isAuthenticated) router.replace(returnTo);
  }, [isAuthenticated, router, returnTo]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError(t('auth.error.email'));
      return;
    }
    setLoading(true);
    const res = await apiClient('/auth/request-otp', {
      method: 'POST',
      body: { email },
      skipAuth: true,
    });
    setLoading(false);
    if (res.success) {
      setStep('otp');
      setResendCountdown(30);
    } else {
      setError(res.error ?? t('shared.error'));
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (otp.length < 6) { setError('Please enter the 6-digit OTP.'); return; }
    setLoading(true);
    const res = await apiClient<{
      accessToken: string;
      refreshToken: string;
      user: { userId: string; email: string; role: 'citizen' | 'advocate' | 'admin' };
    }>('/auth/verify-otp', {
      method: 'POST',
      body: { email, otp },
      skipAuth: true,
    });
    setLoading(false);
    if (res.success && res.data) {
      login(res.data);
      router.push(returnTo);
    } else {
      setError(res.error ?? t('auth.error.invalid'));
      setOtp('');
    }
  }

  async function handleResend() {
    if (resendCountdown > 0) return;
    setLoading(true);
    await apiClient('/auth/request-otp', { method: 'POST', body: { email }, skipAuth: true });
    setLoading(false);
    setResendCountdown(30);
    setOtp('');
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0D1B2A 0%, #162436 50%, #1a2f47 100%)',
      position: 'relative',
      overflow: 'hidden',
      padding: '2rem 1rem',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(circle at 30% 40%, rgba(201,168,76,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(30,50,73,0.8) 0%, transparent 50%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px' }}>
        <Link href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.875rem',
          textDecoration: 'none',
          marginBottom: '2rem',
          transition: 'color 0.2s',
        }}>
          ← {language === 'en' ? 'Back to LegalLink' : 'লিগ্যাললিংকে ফিরুন'}
        </Link>

        <div style={{
          background: 'white',
          borderRadius: '1.5rem',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          animation: 'fadeInScale 0.3s ease',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0D1B2A, #1E3249)',
            padding: '2.5rem 2rem 2rem',
          }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>
                Legal<span style={{ color: '#C9A84C' }}>Link</span>
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem' }}>
              {['email', 'otp'].map((s, i) => (
                <div key={s} style={{
                  height: '4px',
                  borderRadius: '2px',
                  transition: 'all 0.3s',
                  background: (step === 'otp' ? i <= 1 : i === 0) ? '#C9A84C' : 'rgba(255,255,255,0.2)',
                  flex: step === 'otp' && i === 1 ? 2 : step === 'email' && i === 0 ? 2 : 1,
                }} />
              ))}
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {step === 'email' ? t('auth.step1.title') : t('auth.step2.title')}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', marginTop: '0.375rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {step === 'email' ? t('auth.subtitle') : `${t('auth.step2.subtitle')} ${email}`}
            </p>
          </div>

          <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
              <LanguageToggle variant="page" />
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.625rem', padding: '0.75rem 1rem', color: '#DC2626', fontSize: '0.875rem', marginBottom: '1.25rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                {error}
              </div>
            )}

            {step === 'email' ? (
              <form onSubmit={handleRequestOtp}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="auth-email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                    {t('auth.step1.label')}
                  </label>
                  <input id="auth-email" className="input" type="email" placeholder={t('auth.step1.placeholder')} value={email} onChange={e => setEmail(e.target.value)} autoFocus required style={{ fontSize: '1.0625rem' }} />
                </div>
                <button type="submit" id="auth-request-otp" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }} disabled={loading}>
                  {loading ? t('auth.step1.sending') : t('auth.step1.submit')}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="auth-otp" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                    {language === 'en' ? '6-digit verification code' : '৬ সংখ্যার কোড'}
                  </label>
                  <input id="auth-otp" className="input" type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus style={{ fontSize: '1.5rem', letterSpacing: '0.2em', textAlign: 'center', fontFamily: 'monospace' }} />
                </div>
                <button type="submit" id="auth-verify-otp" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }} disabled={loading || otp.length < 6}>
                  {loading ? t('auth.step2.verifying') : t('auth.step2.submit')}
                </button>
                <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: '#6B7280' }}>
                  {resendCountdown > 0 ? (
                    <span style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>{t('auth.step2.resend.wait')} {resendCountdown}s</span>
                  ) : (
                    <button type="button" onClick={handleResend} style={{ background: 'none', border: 'none', color: '#C9A84C', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>{t('auth.step2.resend')}</button>
                  )}
                </div>
                <button type="button" onClick={() => { setStep('email'); setError(''); setOtp(''); }} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '0.875rem', cursor: 'pointer', marginTop: '0.75rem', display: 'block', width: '100%', textAlign: 'center' }}>
                  ← {language === 'en' ? 'Use a different email' : 'অন্য ইমেইল ব্যবহার করুন'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  );
}