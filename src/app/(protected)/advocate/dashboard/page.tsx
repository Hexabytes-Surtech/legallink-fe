'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';
import type {
  Advocate,
  AdvocateConsultation,
  AdvocateDashboardStats,
  ConsultationStatus,
  MyReviewsResponse,
  FeedbackReview,
} from '@/types';

type TabKey = 'requests' | 'active' | 'closed' | 'reviews';

interface ActionState {
  consultationId: string;
  action: 'accept' | 'decline';
}

function relativeTime(iso: string, isBn: boolean): string {
  const then = new Date(iso).getTime();
  if (!then) return '';
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return isBn ? 'এখনই' : 'just now';
  if (min < 60) return isBn ? `${min} মিনিট আগে` : `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return isBn ? `${hr} ঘণ্টা আগে` : `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return isBn ? `${d} দিন আগে` : `${d}d ago`;
  return new Date(iso).toLocaleDateString(isBn ? 'bn-IN' : 'en-IN', { dateStyle: 'medium' });
}

function urgency(text: string): { label: string; color: string } {
  const lower = text.toLowerCase();
  if (/urgent|immediate|emergency|arrest|today|tonight/.test(lower)) {
    return { label: 'High', color: '#DC2626' };
  }
  if (/this week|soon|asap/.test(lower)) {
    return { label: 'Medium', color: '#D97706' };
  }
  return { label: 'Normal', color: '#0D1B2A' };
}

export default function AdvocateDashboardPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isBn = language === 'bn';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [advocate, setAdvocate] = useState<Advocate | null>(null);
  const [stats, setStats] = useState<AdvocateDashboardStats | null>(null);
  const [consultations, setConsultations] = useState<AdvocateConsultation[]>([]);
  const [tab, setTab] = useState<TabKey>('requests');
  const [pendingAction, setPendingAction] = useState<ActionState | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [actionSaving, setActionSaving] = useState(false);
  const [reviews, setReviews] = useState<MyReviewsResponse | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const refreshConsultations = useCallback(async () => {
    const cons = await apiClient<AdvocateConsultation[] | { consultations: AdvocateConsultation[] }>(
      '/advocate/consultations'
    );
    if (cons.success && cons.data) {
      const list = Array.isArray(cons.data) ? cons.data : cons.data.consultations ?? [];
      setConsultations(list);
    }
    const dash = await apiClient<AdvocateDashboardStats>('/advocate/dashboard');
    if (dash.success && dash.data) setStats(dash.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [profile, dash, cons] = await Promise.all([
          apiClient<Advocate>('/advocate/me'),
          apiClient<AdvocateDashboardStats>('/advocate/dashboard'),
          apiClient<AdvocateConsultation[] | { consultations: AdvocateConsultation[] }>(
            '/advocate/consultations'
          ),
        ]);
        if (cancelled) return;
        if (profile.success && profile.data) setAdvocate(profile.data);
        if (dash.success && dash.data) setStats(dash.data);
        if (cons.success && cons.data) {
          const list = Array.isArray(cons.data) ? cons.data : cons.data.consultations ?? [];
          setConsultations(list);
        }
      } catch {
        if (!cancelled) setError(isBn ? 'ড্যাশবোর্ড লোড করা যায়নি।' : 'Could not load dashboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isBn]);

  const buckets = useMemo(() => {
    const requests: AdvocateConsultation[] = [];
    const active: AdvocateConsultation[] = [];
    const closed: AdvocateConsultation[] = [];
    for (const c of consultations) {
      if (c.status === 'pending') requests.push(c);
      else if (c.status === 'accepted') active.push(c);
      else closed.push(c); // declined / closed
    }
    const byRequestedAtDesc = (a: AdvocateConsultation, b: AdvocateConsultation) =>
      new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime();
    requests.sort(byRequestedAtDesc);
    active.sort(byRequestedAtDesc);
    closed.sort(byRequestedAtDesc);
    return { requests, active, closed };
  }, [consultations]);

  async function performAction(consultationId: string, status: ConsultationStatus, note?: string) {
    setActionSaving(true);
    try {
      const res = await apiClient<AdvocateConsultation>(
        `/advocate/consultations/${consultationId}`,
        { method: 'PUT', body: { status, note } }
      );
      if (res.success) {
        // Optimistic local update so the user sees the tab change immediately
        setConsultations(prev =>
          prev.map(c =>
            c.id === consultationId
              ? { ...c, status, accepted_at: status === 'accepted' ? new Date().toISOString() : c.accepted_at, advocate_note: note ?? c.advocate_note }
              : c
          )
        );
        // Refresh stats and inbox
        refreshConsultations();
        setPendingAction(null);
        setActionNote('');
      } else {
        setError(res.error ?? (isBn ? 'কর্মটি সম্পন্ন হয়নি।' : 'Action failed.'));
      }
    } finally {
      setActionSaving(false);
    }
  }

  const status = advocate?.verification_status ?? advocate?.verificationStatus ?? stats?.verificationStatus ?? 'pending';

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: '3.5rem', width: '40%', marginBottom: '2rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '1rem' }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: '320px', borderRadius: '1.25rem' }} />
      </div>
    );
  }

  const pendingCount = Number(stats?.consultationStats?.pending_count ?? buckets.requests.length);
  const activeCount = Number(stats?.consultationStats?.accepted_count ?? buckets.active.length);
  const closedCount = Number(stats?.consultationStats?.closed_count ?? buckets.closed.length);
  const declinedCount = Number(stats?.consultationStats?.declined_count ?? 0);
  const completedThisMonth = closedCount; // Best available signal until "completed" is its own field.

  const tabRows = tab !== 'reviews' ? buckets[tab as Exclude<TabKey, 'reviews'>] : [];

  useEffect(() => {
    if (tab !== 'reviews' || reviews !== null || reviewsLoading) return;
    setReviewsLoading(true);
    apiClient<MyReviewsResponse>('/advocate/reviews').then(res => {
      if (res.success && res.data) setReviews(res.data);
      setReviewsLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <style>{`
        .ad-welcome {
          background: linear-gradient(135deg, #0D1B2A 0%, #1B2E43 100%);
          border-radius: 1.25rem;
          padding: 2.25rem 2.5rem;
          color: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 15px 40px rgba(13,27,42,0.15);
          border: 1px solid rgba(201,168,76,0.25);
        }
        .ad-welcome::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 90% 10%, rgba(201,168,76,0.12) 0%, transparent 40%);
          pointer-events: none;
        }
        .ad-alert {
          border-radius: 0.875rem;
          padding: 0.875rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.875rem;
          font-weight: 500;
        }
        .ad-alert.pending { background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.25); color: #A0803A; }
        .ad-alert.verified { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); color: #059669; }
        .ad-alert.rejected { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); color: #DC2626; }
        .ad-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
        }
        .stat {
          background: white;
          border-radius: 1rem;
          padding: 1.25rem 1.4rem;
          border: 1px solid #E5E7EB;
          transition: all 0.2s;
        }
        .stat.gold {
          border-color: rgba(201,168,76,0.5);
          background: linear-gradient(135deg, rgba(201,168,76,0.06) 0%, white 65%);
          box-shadow: 0 8px 20px rgba(201,168,76,0.15);
        }
        .stat:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(13,27,42,0.06); }
        .stat-label { font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6B7280; }
        .stat-value { font-size: 2rem; font-weight: 800; color: #0D1B2A; margin-top: 0.45rem; }
        .stat-foot { font-size: 0.78rem; color: #9CA3AF; margin-top: 0.5rem; }
        .ad-tabs {
          display: inline-flex;
          background: #F3F4F6;
          padding: 4px;
          border-radius: 9999px;
          gap: 2px;
        }
        .ad-tab {
          padding: 0.55rem 1.2rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #6B7280;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .ad-tab.active {
          background: white;
          color: #0D1B2A;
          box-shadow: 0 2px 6px rgba(13,27,42,0.08);
        }
        .ad-tab-count {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 1px 7px;
          border-radius: 9999px;
          background: rgba(13,27,42,0.08);
          color: #0D1B2A;
        }
        .ad-tab.active .ad-tab-count { background: #C9A84C; color: #0D1B2A; }
        .req-card {
          background: white;
          border-radius: 1rem;
          padding: 1.25rem 1.5rem;
          border: 1px solid #E5E7EB;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }
        .req-card:hover { border-color: rgba(201,168,76,0.4); box-shadow: 0 6px 18px rgba(13,27,42,0.06); }
        .req-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .req-chips { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
        .urg-chip {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border: 1px solid;
        }
        .req-query {
          color: #0D1B2A;
          font-weight: 500;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .req-actions { display: flex; gap: 0.625rem; justify-content: flex-end; flex-wrap: wrap; }
        .req-note-overlay {
          position: fixed; inset: 0;
          background: rgba(13,27,42,0.55);
          backdrop-filter: blur(4px);
          z-index: 200;
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
        }
        .req-note-card {
          background: white;
          border-radius: 1.25rem;
          padding: 1.75rem;
          width: 100%;
          max-width: 460px;
          box-shadow: 0 20px 50px rgba(13,27,42,0.2);
        }
      `}</style>

      {/* Welcome */}
      <div className="ad-welcome">
        <span
          style={{
            background: 'rgba(201,168,76,0.15)',
            color: '#E2C475',
            border: '1px solid rgba(201,168,76,0.3)',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            display: 'inline-block',
            marginBottom: '0.875rem',
          }}
        >
          {isBn ? 'কনসোল অ্যাক্সেস' : 'Console access'}
        </span>
        <h1
          style={{
            fontSize: '1.875rem',
            fontWeight: 800,
            margin: 0,
            fontFamily: isBn ? 'var(--font-bangla)' : 'inherit',
          }}
        >
          {isBn
            ? `স্বাগতম, অ্যাড. ${advocate?.name ?? ''}`
            : `Welcome back, Adv. ${advocate?.name ?? user?.email?.split('@')[0] ?? ''}`}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', marginTop: '0.5rem', marginBottom: 0 }}>
          {isBn
            ? 'অনুরোধ গ্রহণ করুন, সক্রিয় কেস ট্র্যাক করুন, এবং মক্কেলদের সাথে যোগাযোগ রাখুন।'
            : 'Triage incoming requests, track active matters, and stay in touch with clients.'}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#DC2626',
            padding: '0.875rem 1.25rem',
            borderRadius: '0.875rem',
            fontSize: '0.9rem',
          }}
        >
          ⚠ {error}
        </div>
      )}

      {status === 'pending' && (
        <div className="ad-alert pending">
          <span style={{ fontSize: '1.25rem' }}>⏳</span>
          <div>
            <div style={{ fontWeight: 700 }}>
              {isBn ? 'যাচাইকরণ পর্যালোচনাধীন' : 'Verification under review'}
            </div>
            <div style={{ fontSize: '0.85rem', marginTop: 2 }}>
              {isBn
                ? 'যাচাই সম্পন্ন না হওয়া পর্যন্ত আপনি অনুরোধ গ্রহণ করতে পারবেন না।'
                : 'You will start receiving consultation requests once the admin verifies your profile.'}
            </div>
          </div>
        </div>
      )}

      {status === 'rejected' && (
        <div className="ad-alert rejected">
          <span style={{ fontSize: '1.25rem' }}>⚠</span>
          <div>
            <div style={{ fontWeight: 700 }}>
              {isBn ? 'যাচাইকরণ প্রত্যাখ্যাত' : 'Verification rejected'}
            </div>
            <div style={{ fontSize: '0.85rem', marginTop: 2 }}>
              {isBn
                ? 'আপনার নথি পর্যালোচনা করে আবার জমা দিন।'
                : 'Review your uploaded documents and resubmit.'}
            </div>
          </div>
        </div>
      )}

      {status === 'verified' && (
        <div className="ad-alert verified">
          <span style={{ fontSize: '1.25rem' }}>✓</span>
          <div style={{ fontWeight: 700 }}>
            {isBn ? 'আপনার প্রোফাইল যাচাইকৃত। নতুন অনুরোধ গ্রহণ করতে পারবেন।' : 'Your profile is verified. You can accept new requests.'}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="ad-stats">
        <div className={`stat ${pendingCount > 0 ? 'gold' : ''}`}>
          <div className="stat-label">{isBn ? 'পেন্ডিং অনুরোধ' : 'Pending Requests'}</div>
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-foot">
            {pendingCount > 0
              ? isBn ? 'নতুন অনুরোধ অপেক্ষমাণ' : 'New — awaiting your response'
              : isBn ? 'নতুন কিছু নেই' : 'All caught up'}
          </div>
        </div>

        <div className="stat">
          <div className="stat-label">{isBn ? 'সক্রিয় কেস' : 'Active Cases'}</div>
          <div className="stat-value">{activeCount}</div>
          <div className="stat-foot">
            {isBn ? 'চলমান পরামর্শ' : 'Live consultations in progress'}
          </div>
        </div>

        <div className="stat">
          <div className="stat-label">{isBn ? 'এ মাসে শেষ' : 'Completed (this month)'}</div>
          <div className="stat-value">{completedThisMonth}</div>
          <div className="stat-foot">
            {declinedCount > 0
              ? `${declinedCount} ${isBn ? 'প্রত্যাখ্যাত' : 'declined'}`
              : isBn ? 'সমস্যা নেই' : 'No declines'}
          </div>
        </div>

        <div className="stat" style={{ cursor: 'pointer' }} onClick={() => setTab('reviews')}>
          <div className="stat-label">{isBn ? 'গড় রেটিং' : 'Average Rating'}</div>
          <div className="stat-value" style={{ color: stats?.averageRating != null ? '#C9A84C' : '#0D1B2A' }}>
            {stats?.averageRating != null ? `★ ${stats.averageRating.toFixed(1)}` : '—'}
          </div>
          <div className="stat-foot">
            {isBn ? 'রিভিউ ট্যাব দেখুন' : 'See Reviews tab'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div role="tablist" className="ad-tabs">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'requests'}
              className={`ad-tab ${tab === 'requests' ? 'active' : ''}`}
              onClick={() => setTab('requests')}
            >
              {isBn ? 'অনুরোধ' : 'Requests'}
              <span className="ad-tab-count">{buckets.requests.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'active'}
              className={`ad-tab ${tab === 'active' ? 'active' : ''}`}
              onClick={() => setTab('active')}
            >
              {isBn ? 'সক্রিয়' : 'Active'}
              <span className="ad-tab-count">{buckets.active.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'closed'}
              className={`ad-tab ${tab === 'closed' ? 'active' : ''}`}
              onClick={() => setTab('closed')}
            >
              {isBn ? 'বন্ধ' : 'Closed'}
              <span className="ad-tab-count">{buckets.closed.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'reviews'}
              className={`ad-tab ${tab === 'reviews' ? 'active' : ''}`}
              onClick={() => setTab('reviews')}
            >
              {isBn ? 'রিভিউ' : 'Reviews'}
              {reviews && (
                <span className="ad-tab-count">{reviews.totalCount}</span>
              )}
            </button>
          </div>
          <Link href="/advocate/consultations" style={{ fontSize: '0.85rem', color: '#C9A84C', fontWeight: 700, textDecoration: 'none' }}>
            {isBn ? 'বিস্তারিত পৃষ্ঠা' : 'Full inbox'} →
          </Link>
        </div>

        {tab === 'reviews' ? (
          <ReviewsPanel reviews={reviews} loading={reviewsLoading} isBn={isBn} />
        ) : tabRows.length === 0 ? (
          <div
            style={{
              background: 'white',
              border: '1px dashed #E5E7EB',
              borderRadius: '1rem',
              padding: '3.5rem 2rem',
              textAlign: 'center',
              color: '#9CA3AF',
            }}
          >
            {tab === 'requests' && (isBn ? 'কোনো নতুন অনুরোধ নেই।' : 'No pending requests.')}
            {tab === 'active' && (isBn ? 'কোনো সক্রিয় কেস নেই।' : 'No active consultations.')}
            {tab === 'closed' && (isBn ? 'কোনো বন্ধ কেস নেই।' : 'No closed consultations yet.')}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.875rem' }}>
            {tabRows.map(c => {
              const urg = urgency(c.query_text);
              const area = c.classification?.matterType;
              const matterId = c.matter_id;
              return (
                <article key={c.id} className="req-card">
                  <div className="req-head">
                    <div className="req-chips">
                      {tab === 'requests' && (
                        <span
                          className="urg-chip"
                          style={{ color: urg.color, borderColor: urg.color, background: `${urg.color}10` }}
                        >
                          {urg.label}
                        </span>
                      )}
                      {area && <span className="badge badge-navy">{area}</span>}
                      <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                        {relativeTime(c.requested_at, isBn)}
                      </span>
                    </div>
                    <span
                      className={`badge ${
                        c.status === 'accepted'
                          ? 'badge-green'
                          : c.status === 'pending'
                            ? 'badge-gold'
                            : 'badge-gray'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <p
                    className="req-query"
                    style={{ fontFamily: c.query_language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}
                  >
                    {c.query_text}
                  </p>

                  <div className="req-actions">
                    {matterId && (
                      <Link
                        href={`/matter/${matterId}`}
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#0D1B2A' }}
                      >
                        {isBn ? 'বিষয় দেখুন' : 'View matter'}
                      </Link>
                    )}

                    {tab === 'requests' && (
                      <>
                        <button
                          type="button"
                          className="btn-decline"
                          onClick={() => {
                            setPendingAction({ consultationId: c.id, action: 'decline' });
                            setActionNote('');
                          }}
                          disabled={status !== 'verified'}
                        >
                          {isBn ? 'প্রত্যাখ্যান' : 'Decline'}
                        </button>
                        <button
                          type="button"
                          className="btn-accept"
                          onClick={() => performAction(c.id, 'accepted')}
                          disabled={status !== 'verified' || actionSaving}
                        >
                          {isBn ? 'গ্রহণ করুন' : 'Accept'}
                        </button>
                      </>
                    )}

                    {tab === 'active' && (
                      <Link href={`/chat/${c.id}`} className="btn-accept" style={{ textDecoration: 'none' }}>
                        💬 {isBn ? 'চ্যাটে যান' : 'Enter chat'}
                      </Link>
                    )}

                    {tab === 'closed' && (
                      <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                        {isBn ? 'কেবল পঠনযোগ্য' : 'Read-only'}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {pendingAction && (
        <div className="req-note-overlay" onClick={e => e.target === e.currentTarget && setPendingAction(null)}>
          <div className="req-note-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0D1B2A', marginBottom: '0.75rem' }}>
              {pendingAction.action === 'accept'
                ? isBn ? 'অনুরোধ গ্রহণ করুন' : 'Accept this request'
                : isBn ? 'অনুরোধ প্রত্যাখ্যান' : 'Decline this request'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1rem' }}>
              {isBn
                ? 'মক্কেলের জন্য একটি ছোট নোট (ঐচ্ছিক) যোগ করতে পারেন।'
                : 'Add a short note for the citizen (optional).'}
            </p>
            <textarea
              className="input textarea"
              rows={3}
              maxLength={300}
              value={actionNote}
              onChange={e => setActionNote(e.target.value)}
              placeholder={
                pendingAction.action === 'accept'
                  ? isBn ? 'যেমন: কাল সকাল ১০টায় কথা বলব।' : 'e.g. I will reach out tomorrow morning at 10.'
                  : isBn ? 'প্রত্যাখ্যানের কারণ (ঐচ্ছিক)' : 'Reason for declining (optional)'
              }
              style={{ minHeight: '5rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPendingAction(null)}
                disabled={actionSaving}
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                className={pendingAction.action === 'accept' ? 'btn-accept' : 'btn-decline'}
                onClick={() =>
                  performAction(
                    pendingAction.consultationId,
                    pendingAction.action === 'accept' ? 'accepted' : 'declined',
                    actionNote.trim() || undefined
                  )
                }
                disabled={actionSaving}
              >
                {actionSaving
                  ? isBn ? 'অপেক্ষা…' : 'Working…'
                  : pendingAction.action === 'accept'
                    ? isBn ? 'গ্রহণ করুন' : 'Accept'
                    : isBn ? 'প্রত্যাখ্যান করুন' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reviews panel (My Reviews tab) ──────────────────────────────────────────

function StarRow({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#C9A84C', fontSize: '1rem', letterSpacing: '-1px' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ opacity: n <= rating ? 1 : 0.25 }}>★</span>
      ))}
    </span>
  );
}

function ReviewsPanel({ reviews, loading, isBn }: { reviews: MyReviewsResponse | null; loading: boolean; isBn: boolean }) {
  if (loading) {
    return (
      <div style={{ display: 'grid', gap: '0.875rem' }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="skeleton" style={{ height: '96px', borderRadius: '1rem' }} />
        ))}
      </div>
    );
  }

  if (!reviews) {
    return (
      <div style={{ background: 'white', border: '1px dashed #E5E7EB', borderRadius: '1rem', padding: '3.5rem 2rem', textAlign: 'center', color: '#9CA3AF' }}>
        {isBn ? 'রিভিউ লোড করা যায়নি।' : 'Could not load reviews.'}
      </div>
    );
  }

  return (
    <div>
      {/* Summary bar */}
      {reviews.totalCount > 0 && (
        <div style={{
          background: 'white', border: '1px solid #E5E7EB', borderRadius: '1rem',
          padding: '1.25rem 1.5rem', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>
              {reviews.averageRating?.toFixed(1) ?? '—'}
            </span>
            <StarRow rating={Math.round(reviews.averageRating ?? 0)} />
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            {isBn
              ? `${reviews.totalCount}টি রিভিউ${reviews.hiddenCount > 0 ? ` · ${reviews.hiddenCount}টি লুকানো (BCI পর্যালোচনা)` : ''}`
              : `${reviews.totalCount} review${reviews.totalCount !== 1 ? 's' : ''}${reviews.hiddenCount > 0 ? ` · ${reviews.hiddenCount} hidden (BCI review)` : ''}`}
          </div>
        </div>
      )}

      {reviews.reviews.length === 0 ? (
        <div style={{ background: 'white', border: '1px dashed #E5E7EB', borderRadius: '1rem', padding: '3.5rem 2rem', textAlign: 'center', color: '#9CA3AF' }}>
          {isBn ? 'এখনো কোনো রিভিউ নেই।' : 'No reviews yet.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {reviews.reviews.map((r: FeedbackReview & { isVisible?: boolean }) => (
            <div
              key={r.id}
              style={{
                background: 'white', border: '1px solid #E5E7EB', borderRadius: '1rem',
                padding: '1.25rem 1.5rem',
                opacity: r.isVisible === false ? 0.55 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <StarRow rating={r.rating} />
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                    {r.citizenName}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {r.isVisible === false && (
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(239,68,68,0.08)', color: '#DC2626', borderRadius: '9999px', fontWeight: 600 }}>
                      {isBn ? 'লুকানো' : 'Hidden'}
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                    {new Date(r.createdAt).toLocaleDateString(isBn ? 'bn-IN' : 'en-IN', { dateStyle: 'medium' })}
                  </span>
                </div>
              </div>
              {r.comment && (
                <p style={{ fontSize: '0.9rem', color: '#4B5563', lineHeight: 1.5, margin: 0 }}>
                  &ldquo;{r.comment}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
