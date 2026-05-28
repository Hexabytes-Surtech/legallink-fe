'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/features/LanguageToggle';
import { apiClient } from '@/lib/api/client';
import { USE_MOCK, mockDelay, MOCK_MATTER } from '@/data/mock';

type AnalysisStep = 1 | 2 | 3;

const STEP_LABELS = {
  en: ['Classifying your matter...', 'Retrieving relevant laws & judgments...', 'Generating your legal summary...'],
  bn: ['আপনার বিষয় শ্রেণীবদ্ধ করা হচ্ছে...', 'প্রাসঙ্গিক আইন ও রায় খোঁজা হচ্ছে...', 'আপনার আইনি সারসংক্ষেপ তৈরি হচ্ছে...'],
};

export default function IntakePage() {
  const { t, language } = useLanguage();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>(1);
  const [error, setError] = useState('');

  const MAX_CHARS = 2000;
  const steps = STEP_LABELS[language];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) { setError(t('intake.error.empty')); return; }
    if (trimmed.length < 20) { setError(t('intake.error.short')); return; }

    setError('');
    setLoading(true);

    try {
      if (USE_MOCK) {
        setAnalysisStep(1);
        await mockDelay(1200);
        setAnalysisStep(2);
        await mockDelay(1000);
        setAnalysisStep(3);
        await mockDelay(800);
        router.push(`/matter/${MOCK_MATTER.id}`);
        return;
      }

      setAnalysisStep(1);
      const res = await apiClient<{ matterId?: string; id?: string }>('/matter', {
        method: 'POST',
        body: { query: trimmed, language },
      });

      if (!res.success || !res.data) {
        throw new Error(res.error ?? t('intake.error.generic'));
      }

      const matterId = res.data.matterId ?? res.data.id;
      if (!matterId) throw new Error(t('intake.error.generic'));

      try {
        const stubs = JSON.parse(localStorage.getItem('ll_matter_stubs') ?? '[]');
        stubs.unshift({ id: matterId, queryText: trimmed, status: 'user-owned', createdAt: new Date().toISOString() });
        localStorage.setItem('ll_matter_stubs', JSON.stringify(stubs.slice(0, 50)));
      } catch { /* ignore */ }

      router.push(`/matter/${matterId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('intake.error.generic'));
      setLoading(false);
    }
  }

  return (
    <div className="intake-shell">
      <div className="intake-wrap">
        <div style={{ textAlign: 'center', marginBottom: '2.5rem', animation: 'fadeIn 0.5s ease' }}>
          <div className="intake-eyebrow">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A84C', boxShadow: '0 0 8px #C9A84C' }} />
            {language === 'en' ? 'Anonymous · Free · Secure' : 'বেনামী · বিনামূল্যে · নিরাপদ'}
          </div>
          <h1 className="intake-title" style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
            {t('intake.title')}
          </h1>
          <p className="intake-subtitle" style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
            {t('intake.subtitle')}
          </p>
        </div>

        <div className="intake-card" style={{ animation: 'cardIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('intake.language.label')}</span>
            <LanguageToggle variant="page" />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.875rem', padding: '0.875rem 1rem', color: '#DC2626', fontSize: '0.9rem', marginBottom: '1.25rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚠️ {error}
            </div>
          )}

          {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <div style={{ marginBottom: '2rem' }}>
                  {steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1.25rem', borderRadius: '0.875rem', marginBottom: '0.5rem', background: analysisStep === i + 1 ? 'rgba(201,168,76,0.10)' : analysisStep > i + 1 ? 'rgba(16,185,129,0.07)' : 'transparent', transition: 'all 0.4s ease' }}>
                      <div style={{ width: '1.75rem', height: '1.75rem', flexShrink: 0 }}>
                        {analysisStep > i + 1 ? (
                          <svg viewBox="0 0 24 24" fill="#10B981" width="100%" height="100%"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                        ) : analysisStep === i + 1 ? (
                          <div style={{ width: '100%', height: '100%', border: '2.5px solid #C9A84C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', border: '2px solid #E5E7EB', borderRadius: '50%' }} />
                        )}
                      </div>
                      <span style={{ fontSize: '0.9375rem', fontWeight: analysisStep === i + 1 ? 600 : 400, color: analysisStep > i + 1 ? '#059669' : analysisStep === i + 1 ? '#0D1B2A' : '#9CA3AF', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-400)', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                  {language === 'en' ? 'This usually takes 5–10 seconds' : 'এটি সাধারণত ৫-১০ সেকেন্ড লাগে'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                  <textarea
                    id="legal-query"
                    className="intake-textarea"
                    style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'var(--font-sans)' }}
                    placeholder={t('intake.placeholder')}
                    value={query}
                    onChange={e => { if (e.target.value.length <= MAX_CHARS) setQuery(e.target.value); if (error) setError(''); }}
                    maxLength={MAX_CHARS}
                  />
                  <div style={{ position: 'absolute', bottom: '0.75rem', right: '1rem', fontSize: '0.75rem', fontWeight: 600, color: query.length > MAX_CHARS * 0.9 ? '#F59E0B' : '#9CA3AF', background: 'rgba(255,255,255,0.92)', padding: '2px 8px', borderRadius: '9999px' }}>
                    {query.length} / {MAX_CHARS}
                  </div>
                </div>

                <button type="submit" id="intake-submit" className="intake-submit" style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }} disabled={!query.trim()}>
                  {t('intake.submit')}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              </form>
            )}
          </div>

          <div className="intake-trust-row">
            <span className="intake-trust-item">
              <span className="intake-trust-icon">🔒</span>
              <span style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                {language === 'en' ? 'End-to-end private' : 'সম্পূর্ণ ব্যক্তিগত'}
              </span>
            </span>
            <span className="intake-trust-item">
              <span className="intake-trust-icon">⏱</span>
              <span style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                {language === 'en' ? '24h auto-delete' : '২৪ ঘণ্টা পরে মুছে যায়'}
              </span>
            </span>
            <span className="intake-trust-item">
              <span className="intake-trust-icon">✓</span>
              <span style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                {language === 'en' ? 'No sign-up required' : 'সাইন আপ প্রয়োজন নেই'}
              </span>
            </span>
          </div>
        </div>
    </div>
  );
}
