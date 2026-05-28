'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';
import { USE_MOCK, mockDelay } from '@/data/mock';

interface FlaggedMessage {
  messageId: string;
  consultationId: string;
  matterId: string;
  senderType: 'citizen' | 'advocate';
  senderId: string;
  content: string;
  moderationStatus: 'flagged' | 'cleared' | 'pending';
  moderationFlags: string[];
  createdAt: string;
}

const MOCK_FLAGGED: FlaggedMessage[] = [
  {
    messageId: 'msg-f-001',
    consultationId: 'cons-abc-123',
    matterId: 'mat-xyz-456',
    senderType: 'advocate',
    senderId: 'adv-1',
    content: 'I guarantee a 100% win in your case — call me directly at 9876543210 and we can settle the fee separately.',
    moderationStatus: 'flagged',
    moderationFlags: ['direct_contact_solicitation', 'outcome_promise', 'fee_advertising'],
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    messageId: 'msg-f-002',
    consultationId: 'cons-def-789',
    matterId: 'mat-uvw-321',
    senderType: 'advocate',
    senderId: 'adv-2',
    content: 'My fees are 5000 per hearing. Please pay via UPI to 9123456789@upi before we proceed.',
    moderationStatus: 'flagged',
    moderationFlags: ['fee_advertising', 'off_platform_payment'],
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
];

const FLAG_DESCRIPTIONS: Record<string, { en: string; bn: string }> = {
  direct_contact_solicitation: {
    en: 'Sharing direct contact details outside the platform (Rule 36 — no solicitation).',
    bn: 'প্ল্যাটফর্মের বাইরে যোগাযোগ আদান-প্রদান (রুল ৩৬)।',
  },
  outcome_promise: {
    en: 'Promising a legal outcome or guaranteed result (Rule 36 — prohibited).',
    bn: 'ফলাফলের নিশ্চয়তা দেওয়া (রুল ৩৬)।',
  },
  fee_advertising: {
    en: 'Discussing or advertising fee amounts (Rule 36 — fee advertising forbidden).',
    bn: 'ফি প্রচার (রুল ৩৬)।',
  },
  off_platform_payment: {
    en: 'Directing payment off the platform (compliance violation).',
    bn: 'প্ল্যাটফর্মের বাইরে অর্থপ্রদানের নির্দেশনা।',
  },
};

export default function AdminMessagesQueue() {
  const { language } = useLanguage();
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [flagged, setFlagged] = useState<FlaggedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionStates, setActionStates] = useState<Record<string, 'loading' | 'done'>>({});
  const [toast, setToast] = useState('');
  const [confirmReject, setConfirmReject] = useState<FlaggedMessage | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) { router.replace('/auth/signup'); return; }
      if (user?.role !== 'admin') { router.replace('/'); return; }
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return;
    let cancelled = false;
    async function loadFlagged() {
      setLoading(true);
      setError('');
      try {
        if (USE_MOCK) {
          await mockDelay(450);
          if (!cancelled) setFlagged(MOCK_FLAGGED);
        } else {
          const res = await apiClient<FlaggedMessage[]>('/admin/messages/flagged');
          if (cancelled) return;
          if (res.success && Array.isArray(res.data)) {
            setFlagged(res.data);
          } else {
            setError(res.error || (language === 'en' ? 'Failed to load flagged messages.' : 'লোড করা যায়নি।'));
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadFlagged();
    return () => { cancelled = true; };
  }, [isAuthenticated, user, language]);

  async function handleAction(messageId: string, action: 'approve' | 'dismiss') {
    setActionStates(s => ({ ...s, [messageId]: 'loading' }));
    try {
      if (USE_MOCK) {
        await mockDelay(400);
      } else {
        const res = await apiClient(`/admin/messages/${messageId}`, {
          method: 'PUT',
          body: { action },
        });
        if (!res.success) throw new Error(res.error || 'Failed');
      }
      setFlagged(prev => prev.filter(m => m.messageId !== messageId));
      setActionStates(s => { const n = { ...s }; delete n[messageId]; return n; });
      setToast(
        action === 'approve'
          ? (language === 'en' ? '✓ Message approved and delivered' : '✓ বার্তা অনুমোদিত')
          : (language === 'en' ? 'Message rejected' : 'বার্তা প্রত্যাখ্যাত'),
      );
      setTimeout(() => setToast(''), 3500);
    } catch {
      setError(language === 'en' ? 'Failed to process message.' : 'কাজটি সম্পন্ন হয়নি।');
      setActionStates(s => { const n = { ...s }; delete n[messageId]; return n; });
    }
  }

  if (isLoading || (loading && flagged.length === 0)) {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.25rem' }}>
        <div className="skeleton" style={{ height: '2.5rem', width: '40%', marginBottom: '2rem', borderRadius: '0.5rem' }} />
        <div className="skeleton" style={{ height: '160px', borderRadius: '1.25rem', marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: '160px', borderRadius: '1.25rem' }} />
      </div>
    );
  }

  if (user?.role !== 'admin') return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.25rem 4rem' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem', marginBottom: '1rem', color: 'var(--color-gray-500)' }}>
          <Link href="/admin" style={{ color: 'var(--color-gray-500)', textDecoration: 'none' }}>
            {language === 'en' ? 'Admin' : 'অ্যাডমিন'}
          </Link>
          <span>›</span>
          <span style={{ color: 'var(--color-navy)', fontWeight: 600 }}>
            {language === 'en' ? 'Message Moderation' : 'বার্তা মডারেশন'}
          </span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="badge" style={{ marginBottom: '0.5rem', fontSize: '0.7rem', background: 'rgba(239,68,68,0.12)', color: '#991B1B', border: '1px solid rgba(239,68,68,0.3)' }}>
              {language === 'en' ? 'RULE 36 MODERATION' : 'রুল ৩৬ মডারেশন'}
            </div>
            <h1 className="text-headline" style={{ color: 'var(--color-navy)', fontSize: '1.875rem', fontWeight: 800 }}>
              {language === 'en' ? 'Flagged Messages' : 'ফ্ল্যাগ করা বার্তা'}
            </h1>
            <p style={{ color: 'var(--color-gray-500)', marginTop: '0.25rem', maxWidth: '640px' }}>
              {language === 'en'
                ? 'Bar Council Rule 36 violations detected by the moderation system. Approve to clear and broadcast, reject to keep withheld.'
                : 'মডারেশন সিস্টেম দ্বারা সনাক্ত করা রুল ৩৬ লঙ্ঘন। অনুমোদন করে প্রেরণ করুন, প্রত্যাখ্যান করে রাখুন।'}
            </p>
          </div>
          <Link href="/admin/advocates" className="btn btn-secondary btn-sm">
            ← {language === 'en' ? 'Verification Queue' : 'যাচাইকরণ সারি'}
          </Link>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#EF4444', lineHeight: 1 }}>{flagged.length}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: '0.375rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {language === 'en' ? 'Awaiting Review' : 'পর্যালোচনার অপেক্ষায়'}
            </div>
          </div>
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>
              {flagged.filter(m => m.senderType === 'advocate').length}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: '0.375rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {language === 'en' ? 'From Advocates' : 'আইনজীবীদের থেকে'}
            </div>
          </div>
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#C9A84C', lineHeight: 1 }}>
              {flagged.filter(m => m.senderType === 'citizen').length}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: '0.375rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {language === 'en' ? 'From Citizens' : 'নাগরিকদের থেকে'}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.08)', color: '#DC2626', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {flagged.length === 0 ? (
          <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
            <h3 style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '1.125rem' }}>
              {language === 'en' ? 'No flagged messages' : 'কোনো ফ্ল্যাগ করা বার্তা নেই'}
            </h3>
            <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem', marginTop: '0.375rem' }}>
              {language === 'en'
                ? 'Rule 36 violations detected by moderation will appear here.'
                : 'রুল ৩৬ লঙ্ঘন এখানে আসবে।'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {flagged.map(msg => {
              const isLoading = actionStates[msg.messageId] === 'loading';
              return (
                <div
                  key={msg.messageId}
                  className="card"
                  style={{
                    padding: '1.75rem',
                    borderLeft: '4px solid #EF4444',
                    opacity: isLoading ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {/* Top row: sender/time */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(239,68,68,0.12)', color: '#991B1B', border: '1px solid rgba(239,68,68,0.3)', padding: '3px 9px', borderRadius: '9999px', fontWeight: 700 }}>
                        {language === 'en' ? 'Rule 36 Violation' : 'রুল ৩৬ লঙ্ঘন'}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '3px 9px',
                          background: msg.senderType === 'advocate' ? 'rgba(13,27,42,0.08)' : 'rgba(201,168,76,0.14)',
                          color: msg.senderType === 'advocate' ? '#0D1B2A' : '#8B6E1A',
                          border: msg.senderType === 'advocate' ? '1px solid rgba(13,27,42,0.12)' : '1px solid rgba(201,168,76,0.3)',
                          borderRadius: '9999px',
                          fontWeight: 600,
                        }}
                      >
                        {msg.senderType === 'advocate'
                          ? (language === 'en' ? 'Advocate' : 'আইনজীবী')
                          : (language === 'en' ? 'Citizen' : 'নাগরিক')}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-400)', whiteSpace: 'nowrap' }}>
                      {new Date(msg.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>

                  {/* Message body */}
                  <div
                    style={{
                      padding: '1rem 1.25rem',
                      background: 'rgba(239,68,68,0.05)',
                      border: '1px solid rgba(239,68,68,0.18)',
                      borderRadius: '0.75rem',
                      marginBottom: '1rem',
                      fontSize: '0.9375rem',
                      color: '#374151',
                      lineHeight: 1.6,
                      fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
                    }}
                  >
                    &ldquo;{msg.content}&rdquo;
                  </div>

                  {/* Flags */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '0.5rem', letterSpacing: '0.06em' }}>
                      {language === 'en' ? 'Detected Violations' : 'সনাক্ত লঙ্ঘন'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {(msg.moderationFlags ?? []).map(flag => (
                        <div
                          key={flag}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.625rem',
                            padding: '0.5rem 0.75rem',
                            background: 'rgba(239,68,68,0.05)',
                            border: '1px solid rgba(239,68,68,0.18)',
                            borderRadius: '0.5rem',
                            fontSize: '0.8125rem',
                            color: '#7F1D1D',
                            lineHeight: 1.5,
                          }}
                        >
                          <span style={{ flexShrink: 0, marginTop: '1px' }}>⚠️</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'capitalize', marginBottom: '2px' }}>
                              {flag.replace(/_/g, ' ')}
                            </div>
                            <div>{FLAG_DESCRIPTIONS[flag]?.[language] ?? (language === 'en' ? 'Policy violation.' : 'নীতি লঙ্ঘন।')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid #F3F4F6', paddingTop: '1rem' }}>
                    <Link
                      href={`/chat/${msg.consultationId}`}
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#C9A84C', fontWeight: 600 }}
                    >
                      {language === 'en' ? 'View Context →' : 'প্রসঙ্গ দেখুন →'}
                    </Link>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setConfirmReject(msg)}
                      disabled={isLoading}
                      style={{ borderColor: '#EF4444', color: '#EF4444' }}
                    >
                      {language === 'en' ? 'Reject Message' : 'বার্তা প্রত্যাখ্যান'}
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAction(msg.messageId, 'approve')}
                      disabled={isLoading}
                      style={{ background: 'linear-gradient(to right, #059669, #10B981)', borderColor: '#059669' }}
                    >
                      {isLoading ? '⏳' : '✓'} {language === 'en' ? 'Approve & Deliver' : 'অনুমোদন ও প্রেরণ'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject confirmation modal */}
      {confirmReject && (
        <div
          onClick={e => e.target === e.currentTarget && setConfirmReject(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}
        >
          <div style={{ maxWidth: '460px', width: '100%', padding: '2rem', background: 'white', borderRadius: '1rem', boxShadow: '0 25px 60px -15px rgba(13,27,42,0.4)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.5rem' }}>
              {language === 'en' ? 'Reject this message?' : 'এই বার্তাটি প্রত্যাখ্যান?'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginBottom: '1.25rem', lineHeight: 1.55 }}>
              {language === 'en'
                ? 'The message will remain withheld and never delivered to the recipient. The sender will see it marked as not delivered.'
                : 'বার্তাটি প্রাপকের কাছে পৌঁছানো হবে না।'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmReject(null)}>
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  handleAction(confirmReject.messageId, 'dismiss');
                  setConfirmReject(null);
                }}
                style={{ background: '#EF4444', borderColor: '#EF4444' }}
              >
                {language === 'en' ? 'Reject Message' : 'প্রত্যাখ্যান করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--color-navy)',
            color: 'white',
            padding: '0.75rem 1.25rem',
            borderRadius: '9999px',
            boxShadow: '0 12px 30px -10px rgba(13,27,42,0.4)',
            fontSize: '0.875rem',
            fontWeight: 600,
            zIndex: 200,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
