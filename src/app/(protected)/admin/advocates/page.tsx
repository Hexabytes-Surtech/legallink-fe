'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';
import { USE_MOCK, mockDelay } from '@/data/mock';

interface PendingDocument {
  id: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
}

interface PendingAdvocate {
  id: string;
  bar_enrolment_number: string;
  state_bar: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  practice_areas: string[];
  courts: string[];
  languages: string[];
  districts: string[];
  verification_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
  user_email: string;
  documents: PendingDocument[];
}

const MOCK_PENDING: PendingAdvocate[] = [
  {
    id: 'adv-mock-001',
    bar_enrolment_number: 'WB/2019/12345',
    state_bar: 'West Bengal Bar Council',
    name: 'Rajesh Kumar Sharma',
    address: '12B, Park Street, Kolkata 700016',
    phone: '+91 98300 12345',
    email: 'rajesh.sharma@lawchamber.in',
    practice_areas: ['Civil', 'Family'],
    courts: ['Calcutta High Court', 'Alipore District Court'],
    languages: ['English', 'Bengali', 'Hindi'],
    districts: ['Kolkata', 'Howrah'],
    verification_status: 'pending',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    user_email: 'rajesh.sharma@lawchamber.in',
    documents: [
      { id: 'd1', fileUrl: 'https://placehold.co/600x800?text=CoP', fileType: 'certificate_of_practice', uploadedAt: new Date().toISOString() },
      { id: 'd2', fileUrl: 'https://placehold.co/600x800?text=Bar+ID', fileType: 'bar_council_id', uploadedAt: new Date().toISOString() },
    ],
  },
  {
    id: 'adv-mock-002',
    bar_enrolment_number: 'WB/2021/67890',
    state_bar: 'West Bengal Bar Council',
    name: 'Priya Sen Gupta',
    address: 'Block CD, Salt Lake, Kolkata 700064',
    phone: '+91 98311 67890',
    email: 'priya.sengupta@advocate.in',
    practice_areas: ['Labour', 'Consumer'],
    courts: ['Calcutta High Court'],
    languages: ['English', 'Bengali'],
    districts: ['Salt Lake', 'Bidhannagar'],
    verification_status: 'pending',
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    user_email: 'priya.sengupta@advocate.in',
    documents: [
      { id: 'd3', fileUrl: 'https://placehold.co/600x800?text=CoP', fileType: 'certificate_of_practice', uploadedAt: new Date().toISOString() },
    ],
  },
];

export default function AdminAdvocatesQueue() {
  const { language } = useLanguage();
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [pending, setPending] = useState<PendingAdvocate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionStates, setActionStates] = useState<Record<string, 'loading' | 'done'>>({});
  const [rejectModal, setRejectModal] = useState<{ advocateId: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) { router.replace('/auth/signup'); return; }
      if (user?.role !== 'admin') { router.replace('/'); return; }
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return;
    let cancelled = false;
    async function loadPending() {
      setLoading(true);
      setError('');
      try {
        if (USE_MOCK) {
          await mockDelay(500);
          if (!cancelled) setPending(MOCK_PENDING);
        } else {
          const res = await apiClient<PendingAdvocate[]>('/admin/advocates/pending');
          if (cancelled) return;
          if (res.success && Array.isArray(res.data)) {
            setPending(res.data);
          } else {
            setError(res.error || (language === 'en' ? 'Failed to load pending advocates.' : 'লোড করা যায়নি।'));
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPending();
    return () => { cancelled = true; };
  }, [isAuthenticated, user, language]);

  async function handleVerify(advocateId: string, action: 'approve' | 'reject', reason?: string) {
    setActionStates(s => ({ ...s, [advocateId]: 'loading' }));
    try {
      if (USE_MOCK) {
        await mockDelay(450);
      } else {
        const res = await apiClient(`/admin/advocates/${advocateId}/verify`, {
          method: 'PUT',
          body: { action, ...(reason ? { reason } : {}) },
        });
        if (!res.success) throw new Error(res.error || 'Failed');
      }
      setPending(prev => prev.filter(a => a.id !== advocateId));
      setActionStates(s => { const n = { ...s }; delete n[advocateId]; return n; });
      setToast(
        action === 'approve'
          ? (language === 'en' ? '✓ Advocate approved' : '✓ আইনজীবী অনুমোদিত')
          : (language === 'en' ? 'Application rejected' : 'আবেদন প্রত্যাখ্যাত'),
      );
      setTimeout(() => setToast(''), 3500);
    } catch {
      setError(language === 'en' ? `Failed to ${action} advocate.` : 'কাজটি সম্পন্ন হয়নি।');
      setActionStates(s => { const n = { ...s }; delete n[advocateId]; return n; });
    }
  }

  function formatFileLabel(fileType: string): string {
    return fileType
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, ch => ch.toUpperCase());
  }

  if (isLoading || (loading && pending.length === 0)) {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.25rem' }}>
        <div className="skeleton" style={{ height: '2.5rem', width: '40%', marginBottom: '2rem', borderRadius: '0.5rem' }} />
        <div className="skeleton" style={{ height: '180px', borderRadius: '1.25rem', marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: '180px', borderRadius: '1.25rem' }} />
      </div>
    );
  }

  if (user?.role !== 'admin') return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.25rem 4rem' }}>

        {/* Breadcrumb / sub-nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem', marginBottom: '1rem', color: 'var(--color-gray-500)' }}>
          <Link href="/admin" style={{ color: 'var(--color-gray-500)', textDecoration: 'none' }}>
            {language === 'en' ? 'Admin' : 'অ্যাডমিন'}
          </Link>
          <span>›</span>
          <span style={{ color: 'var(--color-navy)', fontWeight: 600 }}>
            {language === 'en' ? 'Advocate Verification' : 'আইনজীবী যাচাইকরণ'}
          </span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="badge badge-navy" style={{ marginBottom: '0.5rem', fontSize: '0.7rem' }}>
              {language === 'en' ? 'VERIFICATION QUEUE' : 'যাচাইকরণ সারি'}
            </div>
            <h1 className="text-headline" style={{ color: 'var(--color-navy)', fontSize: '1.875rem', fontWeight: 800 }}>
              {language === 'en' ? 'Pending Advocate Verifications' : 'অপেক্ষমাণ আইনজীবী যাচাইকরণ'}
            </h1>
            <p style={{ color: 'var(--color-gray-500)', marginTop: '0.25rem', maxWidth: '640px' }}>
              {language === 'en'
                ? 'Review the Bar Council documentation submitted by each advocate before granting verified status.'
                : 'প্রতিটি আইনজীবীর জমা দেওয়া বার কাউন্সিল নথি পর্যালোচনা করুন।'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/admin/messages" className="btn btn-secondary btn-sm">
              {language === 'en' ? 'Flagged Messages →' : 'ফ্ল্যাগ করা বার্তা →'}
            </Link>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#C9A84C', lineHeight: 1 }}>{pending.length}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: '0.375rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {language === 'en' ? 'Awaiting Review' : 'পর্যালোচনার অপেক্ষায়'}
            </div>
          </div>
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#10B981', lineHeight: 1 }}>
              {pending.reduce((sum, a) => sum + (a.documents?.length ?? 0), 0)}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: '0.375rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {language === 'en' ? 'Documents Uploaded' : 'আপলোড করা নথি'}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.08)', color: '#DC2626', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {pending.length === 0 ? (
          <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h3 style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '1.125rem' }}>
              {language === 'en' ? 'All verifications processed' : 'সব যাচাইকরণ সম্পন্ন'}
            </h3>
            <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem', marginTop: '0.375rem' }}>
              {language === 'en' ? 'New advocate signups will appear here for review.' : 'নতুন আইনজীবীরা এখানে পর্যালোচনার জন্য আসবেন।'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {pending.map(adv => {
              const isLoading = actionStates[adv.id] === 'loading';
              return (
                <div key={adv.id} className="card" style={{ padding: '2rem', opacity: isLoading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                  {/* Top row: name + actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>
                        {adv.name}
                      </h3>
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
                        {adv.user_email || adv.email}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-gray-400)', marginTop: '4px' }}>
                        {language === 'en' ? 'Submitted' : 'জমা দেওয়া'}{' '}
                        {new Date(adv.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setRejectModal({ advocateId: adv.id, name: adv.name }); setRejectReason(''); }}
                        disabled={isLoading}
                        style={{ borderColor: '#EF4444', color: '#EF4444' }}
                      >
                        {language === 'en' ? 'Reject' : 'প্রত্যাখ্যান'}
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleVerify(adv.id, 'approve')}
                        disabled={isLoading}
                        style={{ background: 'linear-gradient(to right, #059669, #10B981)', borderColor: '#059669' }}
                      >
                        {isLoading ? '⏳' : '✓'} {language === 'en' ? 'Approve & Verify' : 'অনুমোদন করুন'}
                      </button>
                    </div>
                  </div>

                  {/* Detail grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem 1.5rem', borderTop: '1px solid #F3F4F6', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
                    <Field label={language === 'en' ? 'Bar Enrolment' : 'বার নথিভুক্তি'} value={adv.bar_enrolment_number} mono />
                    <Field label={language === 'en' ? 'State Bar Council' : 'রাজ্য বার কাউন্সিল'} value={adv.state_bar} />
                    <Field label={language === 'en' ? 'Phone' : 'ফোন'} value={adv.phone} />
                    <div>
                      <FieldLabel>{language === 'en' ? 'Practice Areas' : 'অনুশীলন ক্ষেত্র'}</FieldLabel>
                      <ChipList items={adv.practice_areas} />
                    </div>
                    <div>
                      <FieldLabel>{language === 'en' ? 'Languages' : 'ভাষা'}</FieldLabel>
                      <ChipList items={adv.languages} variant="muted" />
                    </div>
                    <div>
                      <FieldLabel>{language === 'en' ? 'Districts' : 'জেলা'}</FieldLabel>
                      <ChipList items={adv.districts} variant="muted" />
                    </div>
                    {adv.courts?.length > 0 && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <FieldLabel>{language === 'en' ? 'Courts of Practice' : 'অনুশীলনের আদালত'}</FieldLabel>
                        <ChipList items={adv.courts} variant="muted" />
                      </div>
                    )}
                  </div>

                  {/* Documents */}
                  <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '1.25rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '0.625rem', letterSpacing: '0.06em' }}>
                      {language === 'en' ? 'Uploaded Documents' : 'আপলোড করা নথি'}{' '}
                      <span style={{ color: adv.documents?.length ? '#059669' : '#EF4444' }}>
                        ({adv.documents?.length ?? 0})
                      </span>
                    </div>
                    {!adv.documents?.length ? (
                      <div style={{ padding: '0.875rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.625rem', fontSize: '0.8125rem', color: '#991B1B' }}>
                        ⚠️{' '}
                        {language === 'en'
                          ? 'No documents uploaded. Verification cannot be approved without Certificate of Practice.'
                          : 'কোনো নথি আপলোড নেই। CoP ছাড়া অনুমোদন সম্ভব নয়।'}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.625rem' }}>
                        {adv.documents.map(doc => (
                          <a
                            key={doc.id}
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.625rem',
                              padding: '0.75rem 0.875rem',
                              background: '#F8F5F0',
                              border: '1px solid rgba(13,27,42,0.08)',
                              borderRadius: '0.625rem',
                              textDecoration: 'none',
                              color: 'var(--color-navy)',
                              fontWeight: 600,
                              fontSize: '0.8125rem',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#C9A84C'; e.currentTarget.style.background = '#FFFCF5'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,27,42,0.08)'; e.currentTarget.style.background = '#F8F5F0'; }}
                          >
                            <span style={{ fontSize: '1.125rem' }}>📄</span>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {formatFileLabel(doc.fileType)}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 500 }}>
                                {language === 'en' ? 'View document ↗' : 'নথি দেখুন ↗'}
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setRejectModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}
        >
          <div className="modal-box" style={{ maxWidth: '480px', width: '100%', padding: '2rem', background: 'white', borderRadius: '1rem', boxShadow: '0 25px 60px -15px rgba(13,27,42,0.4)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.5rem' }}>
              {language === 'en' ? 'Reject Verification' : 'যাচাইকরণ প্রত্যাখ্যান'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginBottom: '1.25rem' }}>
              {language === 'en'
                ? `Provide a reason for rejecting ${rejectModal.name}'s application. This will be sent to the advocate by email.`
                : `${rejectModal.name}-এর আবেদন প্রত্যাখ্যানের কারণ লিখুন।`}
            </p>
            <textarea
              className="input"
              rows={4}
              autoFocus
              placeholder={
                language === 'en'
                  ? 'e.g. Bar enrolment number could not be verified with the State Bar Council registry.'
                  : 'যেমন: বার নম্বর যাচাই করা যায়নি।'
              }
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              maxLength={500}
              style={{ width: '100%', resize: 'vertical', marginBottom: '0.375rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #D1D5DB', fontFamily: 'inherit', fontSize: '0.875rem' }}
            />
            <div style={{ fontSize: '0.6875rem', color: '#9CA3AF', marginBottom: '1.25rem', textAlign: 'right' }}>
              {rejectReason.length}/500
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setRejectModal(null)}>
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  handleVerify(rejectModal.advocateId, 'reject', rejectReason.trim() || undefined);
                  setRejectModal(null);
                }}
                disabled={rejectReason.trim().length < 5}
                style={{ background: '#EF4444', borderColor: '#EF4444', opacity: rejectReason.trim().length < 5 ? 0.6 : 1 }}
              >
                {language === 'en' ? 'Reject Application' : 'প্রত্যাখ্যান করুন'}
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '4px', letterSpacing: '0.06em' }}>
      {children}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div style={{
        fontWeight: 600,
        color: 'var(--color-navy)',
        fontSize: '0.875rem',
        fontFamily: mono ? 'var(--font-mono, monospace)' : 'inherit',
      }}>
        {value || '—'}
      </div>
    </div>
  );
}

function ChipList({ items, variant }: { items: string[]; variant?: 'muted' }) {
  if (!items?.length) return <span style={{ color: '#9CA3AF', fontSize: '0.8125rem' }}>—</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {items.map(p => (
        <span
          key={p}
          className={`badge ${variant === 'muted' ? 'badge-gray' : ''}`}
          style={{
            fontSize: '0.7rem',
            padding: '3px 8px',
            background: variant === 'muted' ? 'rgba(13,27,42,0.06)' : 'rgba(201,168,76,0.14)',
            color: variant === 'muted' ? '#374151' : '#8B6E1A',
            border: variant === 'muted' ? '1px solid rgba(13,27,42,0.08)' : '1px solid rgba(201,168,76,0.3)',
            borderRadius: '9999px',
            fontWeight: 600,
          }}
        >
          {p}
        </span>
      ))}
    </div>
  );
}
