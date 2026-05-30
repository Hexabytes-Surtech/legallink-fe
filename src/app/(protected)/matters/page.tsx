'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';
import { FeedbackModal, isFeedbackPending } from '@/components/feedback/FeedbackModal';
import type { BackendMatterListItem, MatterStub } from '@/types';

interface DisplayRow extends MatterStub {
  consultationId?: string;
  consultationStatus?: 'pending' | 'accepted' | 'declined' | 'closed';
  advocateName?: string;
  scheduledAt?: string;
}

function mergeStubs(api: DisplayRow[], cached: DisplayRow[]): DisplayRow[] {
  const map = new Map<string, DisplayRow>();
  // Cached first, then API overwrites with fresher data
  for (const row of cached) map.set(row.id, row);
  for (const row of api) {
    map.set(row.id, { ...map.get(row.id), ...row });
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function statusBadge(row: DisplayRow, language: 'en' | 'bn') {
  const isBn = language === 'bn';
  if (row.consultationStatus === 'accepted') {
    return { className: 'badge-green', label: isBn ? 'সক্রিয় পরামর্শ' : 'Active Consultation' };
  }
  if (row.consultationStatus === 'pending') {
    return { className: 'badge-gold', label: isBn ? 'উত্তরের অপেক্ষায়' : 'Awaiting Response' };
  }
  if (row.consultationStatus === 'closed') {
    return { className: 'badge-gray', label: isBn ? 'বন্ধ' : 'Closed' };
  }
  if (row.consultationStatus === 'declined') {
    return { className: 'badge-red', label: isBn ? 'প্রত্যাখ্যাত' : 'Declined' };
  }
  return { className: 'badge-navy', label: isBn ? 'অপেক্ষমাণ' : 'Pending' };
}

export default function MyMattersPage() {
  const { t, language } = useLanguage();
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackTarget, setFeedbackTarget] = useState<{ consultationId: string; advocateName: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');

      let cached: DisplayRow[] = [];
      try {
        const raw = localStorage.getItem('ll_matter_stubs');
        cached = raw ? (JSON.parse(raw) as DisplayRow[]) : [];
      } catch {
        cached = [];
      }

      const res = await apiClient<BackendMatterListItem[] | { matters: BackendMatterListItem[] }>('/matter');
      if (cancelled) return;

      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : res.data.matters ?? [];
        const apiRows: DisplayRow[] = list.map(m => ({
          id: m.matterId,
          queryText: m.query,
          matterType: m.matterType ?? undefined,
          status: m.status || 'pending',
          createdAt: m.createdAt,
          consultationId: m.consultationId ?? undefined,
          consultationStatus: m.consultationStatus ?? undefined,
          advocateName: m.advocateName ?? undefined,
          scheduledAt: m.scheduledAt ?? undefined,
        }));
        const merged = mergeStubs(apiRows, cached);
        setRows(merged);
        try {
          localStorage.setItem('ll_matter_stubs', JSON.stringify(merged.slice(0, 50)));
        } catch {
          /* ignore */
        }
        // Auto-trigger feedback for first closed consultation that hasn't been rated or skipped
        const target = merged.find(
          r => r.consultationStatus === 'closed' && r.consultationId && isFeedbackPending(r.consultationId),
        );
        if (target && target.consultationId) {
          setFeedbackTarget({ consultationId: target.consultationId, advocateName: target.advocateName ?? '' });
        }
      } else {
        // Fall back to localStorage cache if the list endpoint is unavailable
        setRows(cached.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        if (res.statusCode && res.statusCode !== 404) {
          setError(res.error ?? t('shared.error'));
        }
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, t]);

  const greeting = useMemo(() => {
    const name = user?.name ?? user?.email?.split('@')[0] ?? '';
    if (language === 'bn') return name ? `স্বাগতম, ${name}` : 'স্বাগতম';
    return name ? `Welcome back, ${name}` : 'Welcome back';
  }, [user, language]);

  if (isLoading || (loading && isAuthenticated)) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-cream)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <div className="skeleton" style={{ height: '2.5rem', width: '30%', marginBottom: '2rem' }} />
          <div className="skeleton" style={{ height: '150px', borderRadius: '1.25rem', marginBottom: '1rem' }} />
          <div className="skeleton" style={{ height: '150px', borderRadius: '1.25rem' }} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)' }}>
      {feedbackTarget && (
        <FeedbackModal
          consultationId={feedbackTarget.consultationId}
          advocateName={feedbackTarget.advocateName}
          onClose={() => setFeedbackTarget(null)}
          onSubmitted={() => setFeedbackTarget(null)}
        />
      )}
      <main
        style={{
          maxWidth: '960px',
          margin: '0 auto',
          padding: '3rem 1.25rem 4rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-gold-dim, #A0803A)',
                marginBottom: 6,
                fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
              }}
            >
              {greeting}
            </div>
            <h1
              className="text-headline"
              style={{
                color: 'var(--color-navy)',
                fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
                margin: 0,
              }}
            >
              {t('matters.title')}
            </h1>
            <p
              style={{
                color: 'var(--color-gray-500)',
                fontSize: '1.0625rem',
                marginTop: '0.5rem',
                fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
              }}
            >
              {t('matters.subtitle')}
            </p>
          </div>
          <Link href="/" className="btn btn-primary btn-sm">
            + {language === 'en' ? 'New Matter' : 'নতুন বিষয়'}
          </Link>
        </div>

        {error && (
          <div
            style={{
              padding: '1rem',
              background: 'rgba(239,68,68,0.08)',
              color: '#DC2626',
              borderRadius: '0.75rem',
              marginBottom: '2rem',
            }}
          >
            {error}
          </div>
        )}

        {rows.length === 0 ? (
          <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
            <h3
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--color-navy)',
                marginBottom: '0.5rem',
                fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
              }}
            >
              {t('matters.empty')}
            </h3>
            <p
              style={{
                color: 'var(--color-gray-400)',
                fontSize: '0.9rem',
                marginBottom: '1.25rem',
                fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
              }}
            >
              {language === 'en'
                ? "You haven't asked anything yet. Describe your problem to get started."
                : 'এখনও কিছু জিজ্ঞাসা করেননি। শুরু করতে আপনার সমস্যা বর্ণনা করুন।'}
            </p>
            <Link href="/" className="btn btn-primary">
              {t('matters.empty.cta')}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            {rows.map(row => {
              const badge = statusBadge(row, language);
              const hasChat = row.consultationStatus === 'accepted' && row.consultationId;
              return (
                <article
                  key={row.id}
                  className="card card-hover"
                  style={{
                    padding: '1.5rem 1.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    borderLeft: '4px solid var(--color-gold, #C9A84C)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className={`badge ${badge.className}`}>{badge.label}</span>
                      {row.matterType && <span className="badge badge-navy">{row.matterType}</span>}
                    </div>
                    <div
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--color-gray-400)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {new Date(row.createdAt).toLocaleDateString(
                        language === 'bn' ? 'bn-IN' : 'en-IN',
                        { year: 'numeric', month: 'short', day: 'numeric' }
                      )}
                    </div>
                  </div>

                  <h3
                    style={{
                      fontSize: '1.0625rem',
                      fontWeight: 500,
                      color: 'var(--color-navy)',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {row.queryText}
                  </h3>

                  {row.advocateName && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--color-gray-600)',
                        fontSize: '0.875rem',
                      }}
                    >
                      <span aria-hidden>👤</span>
                      <span>
                        {language === 'en' ? 'With' : 'সহ'}{' '}
                        <strong style={{ color: 'var(--color-navy)' }}>
                          Adv. {row.advocateName}
                        </strong>
                      </span>
                    </div>
                  )}
                  {row.scheduledAt && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.3rem 0.75rem',
                        background: 'rgba(201,168,76,0.1)',
                        border: '1px solid rgba(201,168,76,0.25)',
                        borderRadius: '9999px',
                        fontSize: '0.8125rem',
                        color: '#A0803A',
                        fontWeight: 600,
                        width: 'fit-content',
                      }}
                    >
                      📅{' '}
                      {new Date(row.scheduledAt).toLocaleString(
                        language === 'bn' ? 'bn-IN' : 'en-IN',
                        { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '0.75rem',
                      marginTop: 'auto',
                      flexWrap: 'wrap',
                    }}
                  >
                    {hasChat && (
                      <Link
                        href={`/chat/${row.consultationId}`}
                        className="btn btn-primary btn-sm"
                      >
                        💬 {language === 'en' ? 'Open Chat' : 'চ্যাট খুলুন'}
                      </Link>
                    )}
                    <Link href={`/matter/${row.id}`} className="btn btn-secondary btn-sm">
                      {language === 'en' ? 'View Matter' : 'বিস্তারিত দেখুন'} →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
