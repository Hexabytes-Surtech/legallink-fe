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
import type { Advocate, BackendMatterResponse, BackendAdvocatesResponse, BackendConsultationResponse, MatterStub } from '@/types';

type ResponseTab = 'english' | 'bengali';

interface DisplayMatter {
  id: string;
  queryText: string;
  queryLanguage: 'en' | 'bn';
  matterType: string | null;
  statute: string | null;
  location: string | null;
  citations: { title: string; section?: string; citation?: string; url?: string; source?: string; text?: string }[];
  aiResponseEnglish: string | null;
  aiResponseBengali: string | null;
  procedural: string | null;
  nextSteps: string | null;
  disclaimer: string;
  createdAt: string;
}

function normalizeLocation(loc: unknown): string | null {
  if (!loc) return null;
  if (typeof loc === 'string') return loc;
  if (typeof loc === 'object') {
    const obj = loc as { state?: string | null; district?: string | null };
    const parts = [obj.district, obj.state].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  }
  return null;
}

function mapBackendMatter(raw: BackendMatterResponse): DisplayMatter {
  const ai = raw.aiResponse;
  return {
    id: raw.matterId,
    queryText: raw.query,
    queryLanguage: raw.language,
    matterType: ai?.classification?.matterType ?? null,
    statute: ai?.classification?.statute ?? null,
    location: normalizeLocation(ai?.classification?.location),
    citations: ai?.citations ?? [],
    aiResponseEnglish: ai?.responseEnglish ?? null,
    aiResponseBengali: ai?.responseBengali ?? null,
    procedural: ai?.procedural ?? null,
    nextSteps: ai?.nextSteps ?? null,
    disclaimer: ai?.disclaimer ?? 'This is legal information only, not legal advice. Please consult a qualified advocate for your specific situation.',
    createdAt: raw.createdAt,
  };
}

function saveMatterStub(matter: DisplayMatter) {
  try {
    const stubs: MatterStub[] = JSON.parse(localStorage.getItem('ll_matter_stubs') ?? '[]');
    if (!stubs.find(s => s.id === matter.id)) {
      stubs.unshift({
        id: matter.id,
        queryText: matter.queryText,
        matterType: matter.matterType ?? undefined,
        status: 'user-owned',
        createdAt: matter.createdAt,
      });
      localStorage.setItem('ll_matter_stubs', JSON.stringify(stubs.slice(0, 50)));
    }
  } catch { /* ignore */ }
}

export default function MatterPage() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();

  const [matter, setMatter] = useState<DisplayMatter | null>(null);
  const [advocates, setAdvocates] = useState<Advocate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<ResponseTab>('english');
  const [showOTP, setShowOTP] = useState(false);
  const [selectedAdvocate, setSelectedAdvocate] = useState<Advocate | null>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [consultationStatus, setConsultationStatus] = useState<'pending' | 'accepted' | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<{ name: string; size: number }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchMatter() {
      setLoading(true);
      try {
        if (USE_MOCK) {
          await mockDelay(600);
          setMatter({
            id: MOCK_MATTER.id,
            queryText: MOCK_MATTER.queryText,
            queryLanguage: MOCK_MATTER.queryLanguage,
            matterType: MOCK_MATTER.classification.matterType,
            statute: MOCK_MATTER.classification.statute ?? null,
            location: normalizeLocation(MOCK_MATTER.classification.location),
            citations: MOCK_MATTER.citations,
            aiResponseEnglish: MOCK_MATTER.aiResponseEnglish,
            aiResponseBengali: MOCK_MATTER.aiResponseBengali,
            procedural: null,
            nextSteps: null,
            disclaimer: MOCK_MATTER.disclaimer,
            createdAt: MOCK_MATTER.createdAt,
          });
          setAdvocates(MOCK_ADVOCATES);
        } else {
          const [matterRes, advocatesRes] = await Promise.all([
            apiClient<BackendMatterResponse>(`/matter/${id}`),
            apiClient<BackendAdvocatesResponse>(`/matter/${id}/advocates`),
          ]);
          if (!matterRes.success || !matterRes.data) {
            setError(t('matter.notFound'));
            return;
          }
          const display = mapBackendMatter(matterRes.data);
          setMatter(display);
          saveMatterStub(display);
          if (advocatesRes.success && advocatesRes.data) {
            setAdvocates(advocatesRes.data.advocates ?? []);
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
      setConsultationId('cons-001');
      setConsultationStatus('pending');
      return;
    }
    const res = await apiClient<BackendConsultationResponse>('/consultations', {
      method: 'POST',
      body: { matterId: id, advocateId },
    });
    if (res.success && res.data) {
      setConsultationId(res.data.consultationId);
      setConsultationStatus(res.data.status === 'accepted' ? 'accepted' : 'pending');
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

  return (
    <div className="matter-shell">
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

      <main className="matter-container">

        {consultationId && consultationStatus && (
          <div className={`matter-status-banner ${consultationStatus}`}>
            <span className="matter-status-icon">{consultationStatus === 'accepted' ? '✅' : '⏳'}</span>
            <div className="status-text" style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {consultationStatus === 'accepted' ? t('chat.consultation.accepted') : t('chat.consultation.waiting')}
            </div>
            {consultationStatus === 'accepted' && consultationId && (
              <Link href={`/chat/${consultationId}`} className="matter-cta-btn" style={{ fontSize: '0.875rem' }}>
                💬 {language === 'en' ? 'Open Chat' : 'চ্যাট খুলুন'}
              </Link>
            )}
          </div>
        )}

        {/* Hero: matter classification */}
        <section className="matter-hero">
          <div className="matter-hero-eyebrow">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A84C', boxShadow: '0 0 8px #C9A84C' }} />
            {language === 'en' ? 'Matter Analysis' : 'মামলা বিশ্লেষণ'}
          </div>
          <h1 className="matter-hero-title" style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
            {matter.matterType ? matter.matterType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : t('matter.classification')}
          </h1>
          <div className="matter-hero-meta">
            {matter.statute && (
              <span className="matter-chip matter-chip-gold">
                <span aria-hidden>📖</span>
                <span>{matter.statute}</span>
              </span>
            )}
            {matter.location && (
              <span className="matter-chip matter-chip-light">
                <span aria-hidden>📍</span>
                <span>{matter.location}</span>
              </span>
            )}
            <span className="matter-chip matter-chip-light">
              <span aria-hidden>📅</span>
              <span>{new Date(matter.createdAt).toLocaleDateString(language === 'bn' ? 'bn-IN' : 'en-IN', { dateStyle: 'medium' })}</span>
            </span>
          </div>
        </section>

        {/* AI Legal Analysis */}
        <section className="matter-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #1E3249 100%)', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: 'rgba(201,168,76,0.18)', border: '1px solid rgba(201,168,76,0.30)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem' }}>🤖</div>
              <div>
                <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'white', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit', margin: 0 }}>{t('matter.aiResponse')}</h2>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                  {language === 'en' ? 'Generated by LegalLink AI' : 'LegalLink AI দ্বারা তৈরি'}
                </div>
              </div>
            </div>
            <div className="matter-tabs" style={{ background: 'rgba(255,255,255,0.08)' }}>
              {(['english', 'bengali'] as ResponseTab[]).map(tabOpt => (
                <button key={tabOpt} onClick={() => setTab(tabOpt)} className={`matter-tab ${tab === tabOpt ? 'active' : ''}`} style={{ color: tab === tabOpt ? '#0D1B2A' : 'rgba(255,255,255,0.7)', background: tab === tabOpt ? '#C9A84C' : 'transparent', fontFamily: tabOpt === 'bengali' ? 'var(--font-bangla)' : 'inherit' }}>
                  {tabOpt === 'english' ? t('matter.tab.english') : t('matter.tab.bengali')}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '2rem 2.25rem' }}>
            {matter.citations.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <span className="matter-section-label">{t('matter.citations')}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.375rem' }}>
                  {matter.citations.map((cite, i) => (
                    <a key={i} href={cite.url ?? '#'} target={cite.url ? '_blank' : undefined} rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, color: '#2563EB', textDecoration: 'none' }}>
                      📄 {cite.source ?? cite.title}{cite.section ? ` — ${cite.section}` : ''}{cite.url && <span>↗</span>}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="matter-prose" style={{ fontFamily: tab === 'bengali' ? 'var(--font-bangla)' : 'var(--font-sans)' }}>
              {tab === 'english' ? (matter.aiResponseEnglish || (language === 'en' ? 'AI analysis is being processed. Please try again in a moment.' : 'বিশ্লেষণ প্রক্রিয়া চলছে।')) : (matter.aiResponseBengali || 'বিশ্লেষণ প্রক্রিয়া চলছে।')}
            </div>

            {matter.procedural && (
              <div className="matter-callout steps">
                <span className="matter-callout-label">{language === 'en' ? '📋 Procedural Steps' : '📋 আইনি পদক্ষেপ'}</span>
                <div style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>{matter.procedural}</div>
              </div>
            )}

            {matter.nextSteps && (
              <div className="matter-callout next">
                <span className="matter-callout-label">{language === 'en' ? '✅ Recommended Next Steps' : '✅ পরবর্তী পদক্ষেপ'}</span>
                <div style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>{matter.nextSteps}</div>
              </div>
            )}

            <div className="matter-callout warning" style={{ marginTop: '1.5rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              ⚠️ {matter.disclaimer || t('matter.disclaimer')}
            </div>
          </div>
        </section>

        {!isAuthenticated && (
          <section className="matter-cta-card">
            <div>
              <h3 style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>{t('matter.cta.title')}</h3>
              <p style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>{t('matter.cta.subtitle')}</p>
            </div>
            <button onClick={() => setShowOTP(true)} className="matter-cta-btn">{t('matter.cta.button')}</button>
          </section>
        )}

        {isAuthenticated && (
          <section className="matter-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div className="matter-card-title" style={{ marginBottom: 0 }}>
                <div className="matter-card-title-icon">📁</div>
                <h2 style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>{t('matter.documents')}</h2>
              </div>
              <button className="adv-action-btn secondary" style={{ width: 'auto', padding: '0.5rem 1.125rem', fontSize: '0.8125rem' }} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? '⏳ Uploading…' : `+ ${t('matter.upload')}`}
              </button>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png" />
            </div>
            {uploadedDocs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.75rem 1rem', color: '#9CA3AF', fontSize: '0.9rem', border: '2px dashed rgba(13,27,42,0.10)', borderRadius: '1rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.375rem', opacity: 0.5 }}>📂</div>
                {language === 'en' ? 'No documents uploaded yet.' : 'এখনও কোনো নথি আপলোড করা হয়নি।'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {uploadedDocs.map((doc, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', background: 'rgba(13,27,42,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(13,27,42,0.06)' }}>
                    <span style={{ fontSize: '1.5rem' }}>📄</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-navy)' }}>{doc.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>{formatFileSize(doc.size)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section style={{ marginTop: '2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <span className="matter-section-label" style={{ color: '#C9A84C' }}>{language === 'en' ? '⚡ MATCHED FOR YOU' : '⚡ আপনার জন্য মিলিত'}</span>
            <h2 className="text-title" style={{ color: 'var(--color-navy)', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit', marginTop: 4 }}>{t('matter.advocates.title')}</h2>
            <p style={{ color: '#6B7280', fontSize: '0.9375rem', marginTop: 4, fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>{t('matter.advocates.subtitle')}</p>
          </div>
          {advocates.length === 0 ? (
            <div className="matter-card" style={{ textAlign: 'center', color: '#9CA3AF', padding: '2.5rem' }}>{t('matter.advocates.empty')}</div>
          ) : (
            <div className="matter-advocate-grid">
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
