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
      const res = await apiClient<{ id: string }>('/matter', {
        method: 'POST',
        body: { query: trimmed, language },
      });

      if (!res.success || !res.data) {
        throw new Error(res.error ?? t('intake.error.generic'));
      }

      router.push(`/matter/${res.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('intake.error.generic'));
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-cream)' }}>
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '3rem 1rem' }}>
        <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ marginBottom: '2.5rem', animation: 'fadeIn 0.5s ease' }}>
            <div className="badge badge-navy" style={{ marginBottom: '1rem' }}>
              Anonymous · Free · Secure
            </div>
            <h1 className="text-headline" style={{ color: 'var(--color-navy)', marginBottom: '0.75rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {t('intake.title')}
            </h1>
            <p style={{ color: 'var(--color-gray-500)', fontSize: '1.0625rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {t('intake.subtitle')}
            </p>
          </div>

          <div className="card" style={{ padding: '2.5rem', animation: 'slideInUp 0.5s ease 0.1s both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-500)' }}>{t('intake.language.label')}</span>
              <LanguageToggle variant="page" />
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.625rem', padding: '0.875rem 1rem', color: '#DC2626', fontSize: '0.9rem', marginBottom: '1.25rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                {error}
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
                    className="input textarea"
                    style={{ minHeight: '220px', fontSize: '1.0625rem', lineHeight: '1.65', padding: '1.125rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'var(--font-sans)', resize: 'vertical' }}
                    placeholder={t('intake.placeholder')}
                    value={query}
                    onChange={e => { if (e.target.value.length <= MAX_CHARS) setQuery(e.target.value); if (error) setError(''); }}
                    maxLength={MAX_CHARS}
                  />
                  <div style={{ position: 'absolute', bottom: '0.75rem', right: '0.875rem', fontSize: '0.75rem', color: query.length > MAX_CHARS * 0.9 ? '#F59E0B' : 'var(--color-gray-300)', background: 'white', padding: '0 4px' }}>
                    {query.length} / {MAX_CHARS}
                  </div>
                </div>

                <button type="submit" id="intake-submit" className="btn btn-primary" style={{ width: '100%', padding: '0.9375rem', fontSize: '1.0625rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }} disabled={!query.trim()}>
                  {t('intake.submit')}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: '4px' }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </form>
            )}
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-gray-400)', marginTop: '1.25rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
            {language === 'en' ? '🔒 Anonymous by default. No sign-up required. Your data expires in 24 hours.' : '🔒 ডিফল্টভাবে বেনামে। কোনো সাইন আপ দরকার নেই। আপনার ডেটা ২৪ ঘণ্টায় মুছে যায়।'}
          </p>
        </div>
      </main>
    </div>
  );
}