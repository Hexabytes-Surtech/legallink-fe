'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';
import { USE_MOCK, mockDelay } from '@/data/mock';

interface PendingAdvocate {
  advocate_id: string;
  name: string;
  email: string;
  bar_enrolment_number: string;
  state_bar: string;
  practice_areas: string[];
  districts: string[];
  languages: string[];
  created_at: string;
  document_count?: number;
}

interface FlaggedMessage {
  message_id: string;
  content: string;
  sender_type: 'citizen' | 'advocate';
  consultation_id: string;
  moderation_flags: string[];
  created_at: string;
}

const MOCK_PENDING: PendingAdvocate[] = [
  {
    advocate_id: 'adv-001',
    name: 'Rajesh Kumar Sharma',
    email: 'rajesh.sharma@lawchamber.in',
    bar_enrolment_number: 'WB/2019/12345',
    state_bar: 'West Bengal Bar Council',
    practice_areas: ['Civil Law', 'Family Law'],
    districts: ['Kolkata', 'Howrah'],
    languages: ['English', 'Bengali', 'Hindi'],
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    document_count: 2,
  },
  {
    advocate_id: 'adv-002',
    name: 'Priya Sen Gupta',
    email: 'priya.sengupta@advocate.in',
    bar_enrolment_number: 'WB/2021/67890',
    state_bar: 'West Bengal Bar Council',
    practice_areas: ['Labour Law', 'Consumer Protection'],
    districts: ['Salt Lake', 'Bidhannagar'],
    languages: ['English', 'Bengali'],
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    document_count: 1,
  },
];

const MOCK_FLAGGED: FlaggedMessage[] = [
  {
    message_id: 'msg-f-001',
    content: 'I guarantee a 100% win, call me directly at 9876543210',
    sender_type: 'advocate',
    consultation_id: 'cons-abc-123',
    moderation_flags: ['direct_contact_solicitation', 'outcome_promise'],
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];

type AdminTab = 'verification' | 'messages';

export default function AdminDashboard() {
  const { language } = useLanguage();
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<AdminTab>('verification');
  const [pendingAdvocates, setPendingAdvocates] = useState<PendingAdvocate[]>([]);
  const [flaggedMessages, setFlaggedMessages] = useState<FlaggedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionStates, setActionStates] = useState<Record<string, 'loading' | 'done'>>({});
  const [rejectModal, setRejectModal] = useState<{ advocateId: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) { router.replace('/auth/signup'); return; }
      if (user?.role !== 'admin') { router.replace('/'); return; }
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return;
    async function loadData() {
      setLoading(true);
      try {
        if (USE_MOCK) {
          await mockDelay(600);
          setPendingAdvocates(MOCK_PENDING);
          setFlaggedMessages(MOCK_FLAGGED);
        } else {
          const [advRes, msgRes] = await Promise.allSettled([
            apiClient<PendingAdvocate[]>('/admin/advocates/pending'),
            apiClient<FlaggedMessage[]>('/admin/messages/flagged'),
          ]);
          if (advRes.status === 'fulfilled' && advRes.value.success && advRes.value.data) {
            setPendingAdvocates(advRes.value.data);
          }
          if (msgRes.status === 'fulfilled' && msgRes.value.success && msgRes.value.data) {
            setFlaggedMessages(msgRes.value.data);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isAuthenticated, user]);

  async function handleVerify(advocateId: string, action: 'approve' | 'reject', reason?: string) {
    setActionStates(s => ({ ...s, [advocateId]: 'loading' }));
    try {
      if (USE_MOCK) {
        await mockDelay(500);
      } else {
        await apiClient(`/admin/advocates/${advocateId}/verify`, {
          method: 'PUT',
          body: { action, ...(reason ? { reason } : {}) },
        });
      }
      setPendingAdvocates(prev => prev.filter(a => a.advocate_id !== advocateId));
      setActionStates(s => ({ ...s, [advocateId]: 'done' }));
    } catch {
      setError(`Failed to ${action} advocate.`);
      setActionStates(s => { const n = { ...s }; delete n[advocateId]; return n; });
    }
  }

  async function handleMessageAction(messageId: string, action: 'approve' | 'dismiss') {
    setActionStates(s => ({ ...s, [messageId]: 'loading' }));
    try {
      if (USE_MOCK) {
        await mockDelay(400);
      } else {
        await apiClient(`/admin/messages/${messageId}`, { method: 'PUT', body: { action } });
      }
      setFlaggedMessages(prev => prev.filter(m => m.message_id !== messageId));
      setActionStates(s => ({ ...s, [messageId]: 'done' }));
    } catch {
      setError(`Failed to process message.`);
    }
  }

  if (isLoading || loading) {
    return (
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div className="skeleton" style={{ height: '2.5rem', width: '30%', marginBottom: '2rem' }} />
        <div className="skeleton" style={{ height: '200px', borderRadius: '1.25rem', marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: '200px', borderRadius: '1.25rem' }} />
      </div>
    );
  }

  if (user?.role !== 'admin') return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.25rem 4rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div className="badge badge-navy" style={{ marginBottom: '0.75rem', fontSize: '0.7rem' }}>ADMIN CONSOLE</div>
          <h1 className="text-headline" style={{ color: 'var(--color-navy)' }}>
            {language === 'en' ? 'LegalLink Admin Dashboard' : 'এলিগ্যাল লিংক প্রশাসন ড্যাশবোর্ড'}
          </h1>
          <p style={{ color: 'var(--color-gray-500)', marginTop: '0.25rem' }}>
            {language === 'en' ? 'Review advocate verifications and flagged Rule 36 messages.' : 'আইনজীবী যাচাইকরণ এবং ফ্ল্যাগ করা বার্তা পর্যালোচনা করুন।'}
          </p>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          {[
            { label: language === 'en' ? 'Pending Verifications' : 'যাচাই অপেক্ষায়', value: pendingAdvocates.length, color: '#C9A84C' },
            { label: language === 'en' ? 'Flagged Messages' : 'ফ্ল্যাগ করা বার্তা', value: flaggedMessages.length, color: '#EF4444' },
            { label: language === 'en' ? 'Actions Today' : 'আজকের পদক্ষেপ', value: 0, color: '#10B981' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: '0.375rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.08)', color: '#DC2626', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* Tab navigation */}
        <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB', marginBottom: '2rem', gap: '1.5rem' }}>
          {([
            { id: 'verification', label: language === 'en' ? 'Advocate Verification' : 'আইনজীবী যাচাইকরণ', count: pendingAdvocates.length },
            { id: 'messages', label: language === 'en' ? 'Flagged Messages' : 'ফ্ল্যাগ করা বার্তা', count: flaggedMessages.length },
          ] as { id: AdminTab; label: string; count: number }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{ border: 'none', background: 'none', padding: '0.75rem 0.25rem', fontSize: '1rem', fontWeight: 700, color: tab === t.id ? 'var(--color-navy)' : 'var(--color-gray-400)', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {t.label}
              {t.count > 0 && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, background: tab === t.id ? '#C9A84C' : 'rgba(13,27,42,0.08)', color: tab === t.id ? '#0D1B2A' : 'var(--color-gray-500)', padding: '2px 7px', borderRadius: '9999px' }}>
                  {t.count}
                </span>
              )}
              {tab === t.id && <span style={{ position: 'absolute', bottom: '-2px', left: 0, right: 0, height: '3px', background: '#C9A84C', borderRadius: '2px' }} />}
            </button>
          ))}
        </div>

        {/* Verification Queue */}
        {tab === 'verification' && (
          <div>
            {pendingAdvocates.length === 0 ? (
              <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <h3 style={{ fontWeight: 600, color: 'var(--color-navy)' }}>
                  {language === 'en' ? 'All verifications processed' : 'সব যাচাইকরণ সম্পন্ন'}
                </h3>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {pendingAdvocates.map(adv => (
                  <div key={adv.advocate_id} className="card" style={{ padding: '2rem', opacity: actionStates[adv.advocate_id] === 'loading' ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.1875rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>{adv.name}</h3>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>{adv.email}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-gray-400)', marginTop: '4px' }}>
                          Submitted {new Date(adv.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setRejectModal({ advocateId: adv.advocate_id, name: adv.name }); setRejectReason(''); }}
                          disabled={actionStates[adv.advocate_id] === 'loading'}
                          style={{ borderColor: '#EF4444', color: '#EF4444' }}
                        >
                          {language === 'en' ? 'Reject' : 'প্রত্যাখ্যান'}
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleVerify(adv.advocate_id, 'approve')}
                          disabled={actionStates[adv.advocate_id] === 'loading'}
                          style={{ background: 'linear-gradient(to right, #059669, #10B981)', borderColor: '#059669' }}
                        >
                          {actionStates[adv.advocate_id] === 'loading' ? '⏳' : '✓'} {language === 'en' ? 'Approve & Verify' : 'অনুমোদন করুন'}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', borderTop: '1px solid #F3F4F6', paddingTop: '1.25rem' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '4px' }}>Bar Enrolment</div>
                        <div style={{ fontWeight: 600, color: 'var(--color-navy)', fontSize: '0.875rem' }}>{adv.bar_enrolment_number}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '4px' }}>State Bar Council</div>
                        <div style={{ fontWeight: 600, color: 'var(--color-navy)', fontSize: '0.875rem' }}>{adv.state_bar}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '4px' }}>Practice Areas</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(adv.practice_areas || []).map(p => (
                            <span key={p} className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{p}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '4px' }}>Documents</div>
                        <div style={{ fontWeight: 600, color: adv.document_count ? '#059669' : '#EF4444', fontSize: '0.875rem' }}>
                          {adv.document_count ?? 0} uploaded
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Flagged Messages */}
        {tab === 'messages' && (
          <div>
            {flaggedMessages.length === 0 ? (
              <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
                <h3 style={{ fontWeight: 600, color: 'var(--color-navy)' }}>
                  {language === 'en' ? 'No flagged messages' : 'কোনো ফ্ল্যাগ করা বার্তা নেই'}
                </h3>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {flaggedMessages.map(msg => (
                  <div key={msg.message_id} className="card" style={{ padding: '1.75rem', borderLeft: '4px solid #EF4444', opacity: actionStates[msg.message_id] === 'loading' ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>Rule 36 Violation</span>
                        <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{msg.sender_type}</span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-400)', whiteSpace: 'nowrap' }}>
                        {new Date(msg.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>

                    <div style={{ padding: '1rem 1.25rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.9375rem', color: '#374151', lineHeight: 1.6 }}>
                      &ldquo;{msg.content}&rdquo;
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                      {msg.moderation_flags.map(flag => (
                        <span key={flag} style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', background: 'rgba(239,68,68,0.08)', color: '#DC2626', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.2)' }}>
                          {flag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid #F3F4F6', paddingTop: '1rem' }}>
                      <Link
                        href={`/chat/${msg.consultation_id}`}
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#C9A84C', fontWeight: 600 }}
                      >
                        View Context →
                      </Link>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleMessageAction(msg.message_id, 'approve')}
                        disabled={actionStates[msg.message_id] === 'loading'}
                        style={{ borderColor: '#10B981', color: '#059669' }}
                      >
                        {language === 'en' ? 'Approve Message' : 'বার্তা অনুমোদন'}
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleMessageAction(msg.message_id, 'dismiss')}
                        disabled={actionStates[msg.message_id] === 'loading'}
                        style={{ background: '#EF4444', borderColor: '#EF4444' }}
                      >
                        {language === 'en' ? 'Dismiss & Warn' : 'খারিজ করুন'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRejectModal(null)}>
          <div className="modal-box" style={{ maxWidth: '480px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.5rem' }}>
              {language === 'en' ? 'Reject Verification' : 'যাচাইকরণ প্রত্যাখ্যান'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginBottom: '1.25rem' }}>
              {language === 'en' ? `Provide a reason for rejecting ${rejectModal.name}'s application.` : `${rejectModal.name}-এর আবেদন প্রত্যাখ্যানের কারণ লিখুন।`}
            </p>
            <textarea
              className="input"
              rows={4}
              placeholder={language === 'en' ? 'e.g. Invalid bar enrolment number, document unclear…' : 'যেমন: ভুল বার নম্বর, নথি অস্পষ্ট…'}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              style={{ width: '100%', resize: 'none', marginBottom: '1.5rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #D1D5DB' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setRejectModal(null)}>
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  handleVerify(rejectModal.advocateId, 'reject', rejectReason);
                  setRejectModal(null);
                }}
                style={{ background: '#EF4444', borderColor: '#EF4444' }}
              >
                {language === 'en' ? 'Reject Application' : 'প্রত্যাখ্যান করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
