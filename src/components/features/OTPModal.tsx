'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';

interface OTPModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  redirectTo?: string;
  contextMessage?: string;
  role?: 'citizen' | 'advocate';
}

type Step = 'email' | 'otp';

export function OTPModal({ onClose, onSuccess, redirectTo, contextMessage, role = 'citizen' }: OTPModalProps) {
  const { t } = useLanguage();
  const { login } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    setResendCountdown(30);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError(t('auth.error.email'));
      return;
    }
    setLoading(true);

    // 1. Try to register with specified role
    const registerRes = await apiClient('/auth/register', {
      method: 'POST',
      body: { email, role },
      skipAuth: true,
    });

    if (registerRes.success) {
      setLoading(false);
      setAuthMode('signup');
      setStep('otp');
      startCountdown();
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } else if (registerRes.statusCode === 409) {
      // 2. Fallback to login
      const loginRes = await apiClient('/auth/login', {
        method: 'POST',
        body: { email },
        skipAuth: true,
      });
      setLoading(false);
      if (loginRes.success) {
        setAuthMode('login');
        setInfoMessage('Welcome back! Enter the code sent to your email to log in.');
        setStep('otp');
        startCountdown();
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setError(loginRes.error ?? t('shared.error'));
      }
    } else {
      setLoading(false);
      setError(registerRes.error ?? t('shared.error'));
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (value && next.every(d => d !== '') && index === 5) {
      verifyOtp(next.join(''));
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      verifyOtp(pasted);
    }
  }

  async function verifyOtp(code: string) {
    setError('');
    setLoading(true);
    const res = await apiClient<{
      accessToken: string;
      user: { userId: string; email: string; role: 'citizen' | 'advocate' | 'admin' };
    }>('/auth/verify-otp', {
      method: 'POST',
      body: { email, otp: code },
      skipAuth: true,
    });
    setLoading(false);
    if (res.success && res.data) {
      // AuthContext handles role-aware redirect (or honours redirectTo override).
      login(res.data, redirectTo);
      onSuccess?.();
      onClose();
    } else {
      setError(res.error ?? t('auth.error.invalid'));
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the full 6-digit OTP.'); return; }
    await verifyOtp(code);
  }

  async function handleResend() {
    if (resendCountdown > 0) return;
    setError('');
    setInfoMessage('');
    setLoading(true);

    let res;
    if (authMode === 'signup') {
      res = await apiClient('/auth/register', {
        method: 'POST', body: { email, role }, skipAuth: true,
      });
    } else {
      res = await apiClient('/auth/login', {
        method: 'POST', body: { email }, skipAuth: true,
      });
    }

    setLoading(false);
    if (res.success) {
      setOtp(['', '', '', '', '', '']);
      startCountdown();
      if (authMode === 'login') {
        setInfoMessage('OTP resent successfully!');
      }
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } else {
      setError(res.error ?? t('shared.error'));
    }
  }

  return (
    <>
      <style>{`
        .otp-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(13,27,42,0.65);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          z-index: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: fadeIn 0.2s ease;
        }
        .otp-modal {
          background: white;
          border-radius: 1.5rem;
          width: 100%;
          max-width: 420px;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0,0,0,0.25);
          animation: fadeInScale 0.25s ease;
        }
        .otp-modal-header {
          background: linear-gradient(135deg, #0D1B2A 0%, #1E3249 100%);
          padding: 2rem 1.75rem 1.5rem;
          position: relative;
        }
        .otp-modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 2rem;
          height: 2rem;
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: 50%;
          color: rgba(255,255,255,0.7);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          transition: all 0.2s;
        }
        .otp-modal-close:hover { background: rgba(255,255,255,0.18); color: white; }
        .otp-modal-step-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .step-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          transition: all 0.3s;
        }
        .step-dot.active { background: #C9A84C; width: 24px; border-radius: 4px; }
        .otp-modal-title {
          font-size: 1.375rem;
          font-weight: 700;
          color: white;
          line-height: 1.2;
        }
        .otp-modal-subtitle {
          font-size: 0.875rem;
          color: rgba(255,255,255,0.55);
          margin-top: 0.375rem;
        }
        .otp-modal-body {
          padding: 1.75rem;
        }
        .otp-context {
          background: rgba(201,168,76,0.08);
          border: 1px solid rgba(201,168,76,0.2);
          border-radius: 0.75rem;
          padding: 0.875rem 1rem;
          font-size: 0.875rem;
          color: #A0803A;
          margin-bottom: 1.25rem;
          line-height: 1.5;
        }
        .otp-error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 0.625rem;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          color: #DC2626;
          margin-bottom: 1rem;
        }
        .otp-info {
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 0.625rem;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          color: #059669;
          margin-bottom: 1rem;
        }
        .otp-inputs {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
          margin-bottom: 1.5rem;
        }
        .otp-input-box {
          width: 3rem;
          height: 3.25rem;
          text-align: center;
          font-size: 1.375rem;
          font-weight: 700;
          color: #0D1B2A;
          border: 2px solid #E5E7EB;
          border-radius: 0.75rem;
          outline: none;
          transition: all 0.2s;
          font-family: monospace;
          background: white;
        }
        .otp-input-box:focus {
          border-color: #C9A84C;
          box-shadow: 0 0 0 3px rgba(201,168,76,0.15);
        }
        .otp-input-box.filled {
          border-color: #0D1B2A;
          background: rgba(13,27,42,0.04);
        }
        .otp-resend {
          text-align: center;
          font-size: 0.875rem;
          color: #6B7280;
          margin-top: 1rem;
        }
        .otp-resend-btn {
          background: none;
          border: none;
          color: #C9A84C;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.875rem;
          padding: 0;
        }
        .otp-resend-btn:disabled { color: #9CA3AF; cursor: default; }
        .form-group { margin-bottom: 1.25rem; }
        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }
      `}</style>

      <div className="otp-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="otp-modal">
          <div className="otp-modal-header">
            <button className="otp-modal-close" onClick={onClose} aria-label="Close">×</button>
            <div className="otp-modal-step-indicator">
              <div className={`step-dot ${step === 'email' ? 'active' : ''}`} />
              <div className={`step-dot ${step === 'otp' ? 'active' : ''}`} />
            </div>
            <div className="otp-modal-title">
              {step === 'email' ? t('auth.step1.title') : t('auth.step2.title')}
            </div>
            <div className="otp-modal-subtitle">
              {step === 'email'
                ? t('auth.subtitle')
                : `${t('auth.step2.subtitle')} ${email}`}
            </div>
          </div>

          <div className="otp-modal-body">
            {contextMessage && (
              <div className="otp-context">{contextMessage}</div>
            )}
             {error && <div className="otp-error">{error}</div>}
             {infoMessage && <div className="otp-info">{infoMessage}</div>}

            {step === 'email' ? (
              <form onSubmit={handleRequestOtp}>
                <div className="form-group">
                  <label htmlFor="otp-email" className="form-label">{t('auth.step1.label')}</label>
                  <input
                    id="otp-email"
                    className="input"
                    type="email"
                    placeholder={t('auth.step1.placeholder')}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={loading}
                >
                  {loading ? t('auth.step1.sending') : t('auth.step1.submit')}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div className="otp-inputs" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      className={`otp-input-box ${digit ? 'filled' : ''}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      aria-label={`OTP digit ${i + 1}`}
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={loading || otp.join('').length < 6}
                >
                  {loading ? t('auth.step2.verifying') : t('auth.step2.submit')}
                </button>
                <div className="otp-resend">
                  {resendCountdown > 0 ? (
                    <span>{t('auth.step2.resend.wait')} {resendCountdown}s</span>
                  ) : (
                    <button
                      type="button"
                      className="otp-resend-btn"
                      onClick={handleResend}
                      disabled={loading}
                    >
                      {t('auth.step2.resend')}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}