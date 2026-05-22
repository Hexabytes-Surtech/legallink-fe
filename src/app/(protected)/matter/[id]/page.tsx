'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';
import { USE_MOCK, mockDelay, MOCK_MATTER, MOCK_ADVOCATES } from '@/data/mock';
import { AdvocateCard } from '@/components/features/AdvocateCard';
import { OTPModal } from '@/components/features/OTPModal';
import type { Matter, Advocate, Consultation } from '@/types';

type ResponseTab = 'english' | 'bengali';

export default function MatterPage() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();

  const [matter, setMatter] = useState<Matter | null>(null);
  const [advocates, setAdvocates] = useState<Advocate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<ResponseTab>('english');
  const [showOTP, setShowOTP] = useState(false);
  const [selectedAdvocate, setSelectedAdvocate] = useState<Advocate | null>(null);
  const [consultationStatus, setConsultationStatus] = useState<Consultation | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<{ name: string; size: number; url?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchMatter() {
      setLoading(true);
      try {
        if (USE_MOCK) {
          await mockDelay(600);
          setMatter(MOCK_MATTER);
          setAdvocates(MOCK_ADVOCATES);
        } else {
          const [matterRes, advocatesRes] = await Promise.all([
            apiClient<Matter>(`/matter/${id}`),
            apiClient<Advocate[]>(`/matter/${id}/advocates`),
          ]);
          if (!matterRes.success || !matterRes.data) {
            setError(t('matter.notFound'));
            return;
          }
          setMatter(matterRes.data);
          if (advocatesRes.success && advocatesRes.data) {
            setAdvocates(advocatesRes.data);
          }
        }
      } catch {
        setError(t('shared.error'));
      } finally {
        setLoading(false);
      }
    }
    fetchMatter();
  }, [id, t]);

  const submitConsultation = useCallback(async (advocateId: string) => {
    if (USE_MOCK) {
      await mockDelay(500);
      setConsultationStatus({
        id: 'cons-001',
        matterId: id as string,
        citizenId: 'citizen-001',
        advocateId,
        status: 'requested',
        requestedAt: new Date().toISOString(),
      });
      return;
    }
    const res = await apiClient<Consultation>('/consultations', {
      method: 'POST',
      body: { matterId: id, advocateId },
    });
    if (res.success && res.data) {
      setConsultationStatus(res.data);
    }
  }, [id]);

  const handleRequestConsultation = useCallback((advocate: Advocate) => {
    setSelectedAdvocate(advocate);
    const advocateId = advocate.id || advocate.advocate_id;
    if (!isAuthenticated) {
      setShowOTP(true);
    } else if (advocateId) {
      submitConsultation(advocateId);
    }
  }, [isAuthenticated, submitConsultation]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      if (USE_MOCK) {
        await mockDelay(1200);
        setUploadedDocs(prev => [...prev, { name: file.name, size: file.size }]);
      } else {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiClient(`/matter/${id}/documents`, { method: 'POST', formData });
        if (res.success) {
          setUploadedDocs(prev => [...prev, { name: file.name, size: file.size }]);
        }
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-cream)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <div className="skeleton" style={{ height: '1.5rem', width: '40%', marginBottom: '1rem' }} />
          <div className="skeleton" style={{ height: '2.5rem', width: '70%', marginBottom: '2rem' }} />
          <div className="skeleton" style={{ height: '300px', borderRadius: '1.25rem' }} />
        </div>
      </div>
    );
  }

  if (error || !matter) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-cream)' }}>
        <div style={{ textAlign: 'center', padding: '6rem 1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: 'var(--color-navy)', marginBottom: '0.75rem' }}>{error || t('matter.notFound')}</h2>
          <Link href="/intake" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: '1rem' }}>
            {language === 'en' ? 'Start a new query' : 'নতুন প্রশ্ন করুন'}
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = matter.expiresAt && new Date(matter.expiresAt) < new Date();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-cream)' }}>
      {showOTP && (
        <OTPModal
          onClose={() => setShowOTP(false)}
          contextMessage={selectedAdvocate ? `To request a consultation with ${selectedAdvocate.name}, please sign in or create a free account.` : undefined}
          onSuccess={() => {
            const advocateId = selectedAdvocate?.id || selectedAdvocate?.advocate_id;
            if (advocateId) submitConsultation(advocateId);
          }}
          redirectTo={`/matter/${id}`}
        />
      )}

      <main style={{ flex: 1, maxWidth: '960px', margin: '0 auto', width: '100%', padding: '2.5rem 1.25rem 4rem' }}>
        {isExpired && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.875rem', padding: '1rem 1.25rem', marginBottom: '1.5rem', color: '#DC2626', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
            {t('matter.expired')}
          </div>
        )}

        {consultationStatus && (
          <div style={{ background: consultationStatus.status === 'accepted' ? 'rgba(16,185,129,0.08)' : 'rgba(201,168,76,0.08)', border: `1px solid ${consultationStatus.status === 'accepted' ? 'rgba(16,185,129,0.3)' : 'rgba(201,168,76,0.3)'}`, borderRadius: '0.875rem', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{consultationStatus.status === 'accepted' ? '✅' : '⏳'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--color-navy)' }}>
                {consultationStatus.status === 'accepted' ? t('chat.consultation.accepted') : t('chat.consultation.waiting')}
              </div>
            </div>
            {consultationStatus.status === 'accepted' && (
              <Link href={`/chat/${consultationStatus.id}`} className="btn btn-primary btn-sm">
                {language === 'en' ? 'Open Chat' : 'চ্যাট খুলুন'}
              </Link>
            )}
          </div>
        )}

        <section style={{ marginBottom: '2rem', animation: 'fadeIn 0.5s ease' }}>
          <div className="card" style={{ padding: '1.75rem 2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '2.25rem', height: '2.25rem', background: 'rgba(13,27,42,0.06)', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem' }}>⚖️</div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-navy)', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>{t('matter.classification')}</h2>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {matter.classification?.matterType && (
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF', marginBottom: '4px' }}>{t('matter.type')}</div>
                  <span className="badge badge-navy" style={{ fontSize: '0.8125rem' }}>{matter.classification.matterType}</span>
                </div>
              )}
              {matter.classification?.statute && (
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF', marginBottom: '4px' }}>{t('matter.statute')}</div>
                  <span className="badge badge-blue">{matter.classification.statute}</span>
                </div>
              )}
              {matter.classification?.location && (
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF', marginBottom: '4px' }}>{t('matter.district')}</div>
                  <span className="badge badge-gray">📍 {matter.classification.location}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '2rem', animation: 'slideInUp 0.5s ease 0.1s both' }}>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #0D1B2A, #1E3249)', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🤖</span>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'white', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>{t('matter.aiResponse')}</h2>
              </div>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: '0.625rem', padding: '3px', gap: '2px' }}>
                {(['english', 'bengali'] as ResponseTab[]).map(tabOpt => (
                  <button key={tabOpt} onClick={() => setTab(tabOpt)} style={{ padding: '0.3rem 0.875rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, transition: 'all 0.2s', background: tab === tabOpt ? '#C9A84C' : 'transparent', color: tab === tabOpt ? '#0D1B2A' : 'rgba(255,255,255,0.6)', fontFamily: tabOpt === 'bengali' ? 'var(--font-bangla)' : 'inherit' }}>
                    {tabOpt === 'english' ? t('matter.tab.english') : t('matter.tab.bengali')}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: '2rem' }}>
              {matter.citations?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF', marginBottom: '0.625rem' }}>{t('matter.citations')}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {matter.citations.map((cite, i) => (
                      <a key={i} href={cite.url ?? '#'} target={cite.url ? '_blank' : undefined} rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 12px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, color: '#2563EB', textDecoration: 'none', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.14)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.08)'}>
                        📄 {cite.title}{cite.section ? ` — ${cite.section}` : ''}{cite.url && <span>↗</span>}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ fontSize: '1rem', lineHeight: '1.75', color: '#1F2937', whiteSpace: 'pre-wrap', fontFamily: tab === 'bengali' ? 'var(--font-bangla)' : 'var(--font-sans)' }}>
                {tab === 'english' ? matter.aiResponseEnglish : matter.aiResponseBengali}
              </div>
              <div style={{ marginTop: '1.75rem', padding: '1rem 1.25rem', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '0.75rem', fontSize: '0.8125rem', color: '#92400E', lineHeight: '1.55', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                ⚠️ {t('matter.disclaimer')}
              </div>
            </div>
          </div>
        </section>

        {!isAuthenticated && (
          <section style={{ marginBottom: '2rem', animation: 'slideInUp 0.5s ease 0.2s both' }}>
            <div style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #1E3249 100%)', borderRadius: '1.25rem', padding: '2rem 2rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'white', marginBottom: '0.375rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>{t('matter.cta.title')}</h3>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.55)', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>{t('matter.cta.subtitle')}</p>
              </div>
              <button onClick={() => setShowOTP(true)} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>{t('matter.cta.button')}</button>
            </div>
          </section>
        )}

        {isAuthenticated && (
          <section style={{ marginBottom: '2rem', animation: 'slideInUp 0.5s ease 0.25s both' }}>
            <div className="card" style={{ padding: '1.75rem 2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-navy)', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>{t('matter.documents')}</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? '⏳ Uploading...' : `+ ${t('matter.upload')}`}
                </button>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
              </div>
              {uploadedDocs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-gray-400)', fontSize: '0.9rem' }}>{language === 'en' ? 'No documents uploaded yet.' : 'এখনও কোনো নথি আপলোড করা হয়নি।'}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {uploadedDocs.map((doc, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 1rem', background: 'var(--color-gray-50)', borderRadius: '0.625rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>📄</span>
                      <div style={{ flex: 1 }}><div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--color-navy)' }}>{doc.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>{formatFileSize(doc.size)}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <section style={{ animation: 'slideInUp 0.5s ease 0.3s both' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 className="text-title" style={{ color: 'var(--color-navy)', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>{t('matter.advocates.title')}</h2>
            <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9375rem', marginTop: '4px', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>{t('matter.advocates.subtitle')}</p>
          </div>
          {advocates.length === 0 ? (
            <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-gray-400)' }}>{t('matter.advocates.empty')}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {advocates.map(advocate => (
                <AdvocateCard key={advocate.id || advocate.advocate_id} advocate={advocate} onRequestConsultation={handleRequestConsultation} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}