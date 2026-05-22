'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';
import { LanguageToggle } from '@/components/features/LanguageToggle';

function AdvocateSignupContent() {
  const { t, language } = useLanguage();
  const { isAuthenticated, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') ?? '/advocate/onboarding';

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
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
    setInfoMessage('');
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError(language === 'en' ? 'Please enter a valid email address.' : 'অনুগ্রহ করে একটি সঠিক ইমেল লিখুন।');
      return;
    }
    setLoading(true);

    // 1. Try to register with role advocate
    const registerRes = await apiClient('/auth/register', {
      method: 'POST',
      body: { email, role: 'advocate' },
      skipAuth: true,
    });

    if (registerRes.success) {
      setLoading(false);
      setAuthMode('signup');
      setStep('otp');
      setResendCountdown(30);
    } else if (registerRes.statusCode === 409) {
      // 2. If already registered, fall back to requesting login OTP
      const loginRes = await apiClient('/auth/login', {
        method: 'POST',
        body: { email },
        skipAuth: true,
      });
      setLoading(false);
      if (loginRes.success) {
        setAuthMode('login');
        setInfoMessage(language === 'en' ? 'Welcome back, Advocate! Enter the code sent to your email to log in.' : 'স্বাগতম, অ্যাডভোকেট! লগইন করতে আপনার ইমেইলে পাঠানো কোডটি লিখুন।');
        setStep('otp');
        setResendCountdown(30);
      } else {
        setError(loginRes.error ?? t('shared.error'));
      }
    } else {
      setLoading(false);
      setError(registerRes.error ?? t('shared.error'));
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
    setError('');
    setInfoMessage('');

    let res;
    if (authMode === 'signup') {
      res = await apiClient('/auth/register', {
        method: 'POST',
        body: { email, role: 'advocate' },
        skipAuth: true,
      });
    } else {
      res = await apiClient('/auth/login', {
        method: 'POST',
        body: { email },
        skipAuth: true,
      });
    }

    setLoading(false);
    if (res.success) {
      setResendCountdown(30);
      setOtp('');
      if (authMode === 'login') {
        setInfoMessage(language === 'en' ? 'OTP resent successfully!' : 'ওটিপি পুনরায় পাঠানো হয়েছে!');
      }
    } else {
      setError(res.error ?? t('shared.error'));
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #09131F 0%, #0D1B2A 50%, #152232 100%)',
      position: 'relative',
      overflow: 'hidden',
      padding: '2rem 1rem',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(circle at 20% 30%, rgba(201,168,76,0.12) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(26,47,71,0.9) 0%, transparent 50%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '450px' }}>
        <Link href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          color: 'rgba(255,255,255,0.45)',
          fontSize: '0.875rem',
          textDecoration: 'none',
          marginBottom: '1.5rem',
          transition: 'color 0.2s',
        }}>
          ← {language === 'en' ? 'Back to home' : 'হোমপেজে ফিরুন'}
        </Link>

        <div style={{
          background: 'white',
          borderRadius: '1.5rem',
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
          border: '1px solid rgba(201,168,76,0.2)',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0D1B2A, #182C40)',
            padding: '2.5rem 2rem 2rem',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>
                Legal<span style={{ color: '#C9A84C' }}>Link</span>
              </span>
              <span style={{
                background: 'rgba(201, 168, 76, 0.15)',
                color: '#E2C475',
                border: '1px solid rgba(201, 168, 76, 0.3)',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {language === 'en' ? 'Advocate Portal' : 'অ্যাডভোকেট পোর্টাল'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem' }}>
              {['email', 'otp'].map((s, i) => (
                <div key={s} style={{
                  height: '4px',
                  borderRadius: '2px',
                  transition: 'all 0.3s',
                  background: (step === 'otp' ? i <= 1 : i === 0) ? '#C9A84C' : 'rgba(255,255,255,0.15)',
                  flex: step === 'otp' && i === 1 ? 2 : step === 'email' && i === 0 ? 2 : 1,
                }} />
              ))}
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {step === 'email' 
                ? (language === 'en' ? 'Join as Advocate' : 'অ্যাডভোকেট হিসেবে যোগ দিন')
                : (language === 'en' ? 'Verify your identity' : 'আপনার পরিচয় যাচাই করুন')}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', marginTop: '0.375rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {step === 'email' 
                ? (language === 'en' ? 'Offer legal consultations and manage matters online.' : 'অনলাইনে আইনি পরামর্শ দিন এবং আপনার মামলাগুলি পরিচালনা করুন।')
                : `${language === 'en' ? 'Verification code sent to' : 'কোড পাঠানো হয়েছে আপনার এই ইমেইলে:'} ${email}`}
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

            {infoMessage && (
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.625rem', padding: '0.75rem 1rem', color: '#059669', fontSize: '0.875rem', marginBottom: '1.25rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                {infoMessage}
              </div>
            )}

            {step === 'email' ? (
              <form onSubmit={handleRequestOtp}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="auth-email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                    {language === 'en' ? 'Professional Email Address' : 'পেশাগত ইমেল ঠিকানা'}
                  </label>
                  <input id="auth-email" className="input" type="email" placeholder="advocate@example.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus required style={{ fontSize: '1.0625rem' }} />
                </div>
                <button type="submit" id="auth-request-otp" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', fontSize: '1.05rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit', background: 'linear-gradient(to right, #0D1B2A, #182C40)', borderColor: '#0D1B2A' }} disabled={loading}>
                  {loading 
                    ? (language === 'en' ? 'Sending Code...' : 'কোড পাঠানো হচ্ছে...') 
                    : (language === 'en' ? 'Request Verification Code' : 'ভেরিফিকেশন কোড পাঠান')}
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
                <button type="submit" id="auth-verify-otp" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', fontSize: '1.05rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit', background: 'linear-gradient(to right, #C9A84C, #E2C475)', borderColor: '#C9A84C', color: '#0D1B2A', fontWeight: 700 }} disabled={loading || otp.length < 6}>
                  {loading 
                    ? (language === 'en' ? 'Verifying...' : 'যাচাই করা হচ্ছে...') 
                    : (language === 'en' ? 'Verify & Continue' : 'যাচাই করুন এবং এগিয়ে যান')}
                </button>
                <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: '#6B7280' }}>
                  {resendCountdown > 0 ? (
                    <span style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                      {language === 'en' ? 'Resend in' : 'আবার পাঠান'} {resendCountdown}s
                    </span>
                  ) : (
                    <button type="button" onClick={handleResend} style={{ background: 'none', border: 'none', color: '#C9A84C', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                      {language === 'en' ? 'Resend Code' : 'কোড পুনরায় পাঠান'}
                    </button>
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

export default function AdvocateSignupPage() {
  return (
    <Suspense>
      <AdvocateSignupContent />
    </Suspense>
  );
}
