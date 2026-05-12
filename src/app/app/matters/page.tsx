'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { USE_MOCK, mockDelay, MOCK_MATTERS, type Matter } from '@/lib/mock-data';

export default function MyMattersPage() {
  const { t, language } = useLanguage();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/signup?returnTo=/app/matters');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchMatters() {
      setLoading(true);
      try {
        if (USE_MOCK) {
          await mockDelay(600);
          setMatters(MOCK_MATTERS);
        } else {
          // Assume Person 2 will build GET /api/v1/matter (list matters for user)
          const res = await apiClient<Matter[]>('/matter');
          if (res.success && res.data) {
            setMatters(res.data);
          } else {
            throw new Error(res.error || t('shared.error'));
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('shared.error'));
      } finally {
        setLoading(false);
      }
    }
    fetchMatters();
  }, [isAuthenticated]);

  if (isLoading || (loading && isAuthenticated)) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-cream)' }}>
        <Navbar />
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <div className="skeleton" style={{ height: '2.5rem', width: '30%', marginBottom: '2rem' }} />
          <div className="skeleton" style={{ height: '150px', borderRadius: '1.25rem', marginBottom: '1rem' }} />
          <div className="skeleton" style={{ height: '150px', borderRadius: '1.25rem' }} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null; // Wait for redirect

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-cream)' }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: '960px', margin: '0 auto', width: '100%', padding: '3rem 1.25rem 4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h1 className="text-headline" style={{ color: 'var(--color-navy)', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {t('matters.title')}
            </h1>
            <p style={{ color: 'var(--color-gray-500)', fontSize: '1.0625rem', marginTop: '0.25rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {t('matters.subtitle')}
            </p>
          </div>
          <Link href="/app/intake" className="btn btn-primary btn-sm">
            + {language === 'en' ? 'New Matter' : 'নতুন বিষয়'}
          </Link>
        </div>

        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.08)', color: '#DC2626', borderRadius: '0.75rem', marginBottom: '2rem' }}>
            {error}
          </div>
        )}

        {matters.length === 0 && !error ? (
          <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '0.5rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {t('matters.empty')}
            </h3>
            <Link href="/app/intake" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
              {t('matters.empty.cta')}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            {matters.map(matter => {
              const isExpired = matter.expiresAt && new Date(matter.expiresAt) < new Date();
              return (
                <div key={matter.id} className="card card-hover" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {matter.classification?.matterType && (
                        <span className="badge badge-navy">
                          {matter.classification.matterType}
                        </span>
                      )}
                      <span className={`badge ${matter.status === 'session-owned' ? 'badge-gray' : 'badge-green'}`}>
                        {matter.status === 'session-owned' ? t('matters.status.session') : t('matters.status.owned')}
                      </span>
                      {isExpired && <span className="badge badge-red">{t('matter.expired')}</span>}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-gray-400)', whiteSpace: 'nowrap' }}>
                      {new Date(matter.createdAt).toLocaleDateString(language === 'bn' ? 'bn-IN' : 'en-IN', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </div>
                  </div>

                  <h3 style={{
                    fontSize: '1.0625rem',
                    fontWeight: 500,
                    color: 'var(--color-navy)',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {matter.queryText}
                  </h3>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
                    <Link href={`/app/matter/${matter.id}`} className="btn btn-ghost btn-sm" style={{ fontWeight: 600, color: '#C9A84C' }}>
                      {t('matters.view')} →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
