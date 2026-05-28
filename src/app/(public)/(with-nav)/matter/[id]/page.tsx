'use client';

import { use, useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';
import { AdvocateCard } from '@/components/features/AdvocateCard';
import { OTPModal } from '@/components/features/OTPModal';
import type {
  Advocate,
  BackendMatterResponse,
  BackendAdvocatesResponse,
  BackendConsultationResponse,
  BackendCitation,
  Classification,
  ClassificationLocation,
  MatterStub,
} from '@/types';

type ResponseTab = 'english' | 'bengali';

interface DisplayMatter {
  id: string;
  queryText: string;
  queryLanguage: 'en' | 'bn';
  matterType: string | null;
  statuteLabel: string | null;
  location: string | null;
  citations: BackendCitation[];
  aiResponseEnglish: string | null;
  aiResponseBengali: string | null;
  procedural: string | null;
  nextSteps: string | null;
  disclaimer: string;
  createdAt: string;
}

// Backend may return location as a string or as { state, district } — both render fine here.
function normalizeLocation(loc: Classification['location']): string | null {
  if (!loc) return null;
  if (typeof loc === 'string') return loc.trim() || null;
  if (typeof loc === 'object') {
    const obj = loc as ClassificationLocation;
    const parts = [obj.district, obj.state].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  }
  return null;
}

// Statute label may be on classification.statute OR derived from applicableLaws.
function deriveStatuteLabel(c: Classification | null | undefined): string | null {
  if (!c) return null;
  if (typeof c.statute === 'string' && c.statute.trim()) return c.statute;
  const first = c.applicableLaws?.[0];
  if (first?.act) {
    return first.sections?.length ? `${first.act} §${first.sections.join(', §')}` : first.act;
  }
  return null;
}

function mapBackendMatter(raw: BackendMatterResponse): DisplayMatter {
  const ai = raw.aiResponse;
  const c = ai?.classification ?? null;
  return {
    id: raw.matterId,
    queryText: raw.query,
    queryLanguage: raw.language,
    matterType: c?.matterType ?? null,
    statuteLabel: deriveStatuteLabel(c),
    location: normalizeLocation(c?.location ?? null),
    citations: ai?.citations ?? [],
    aiResponseEnglish: ai?.responseEnglish ?? null,
    aiResponseBengali: ai?.responseBengali ?? null,
    procedural: ai?.procedural ?? null,
    nextSteps: ai?.nextSteps ?? null,
    disclaimer:
      ai?.disclaimer ??
      'This is legal information only, not legal advice. Please consult a qualified advocate for your specific situation.',
    createdAt: raw.createdAt,
  };
}

function saveMatterStub(matter: DisplayMatter) {
  try {
    const stubs: MatterStub[] = JSON.parse(localStorage.getItem('ll_matter_stubs') ?? '[]');
    const idx = stubs.findIndex(s => s.id === matter.id);
    const next: MatterStub = {
      id: matter.id,
      queryText: matter.queryText,
      matterType: matter.matterType ?? undefined,
      status: 'user-owned',
      createdAt: matter.createdAt,
    };
    if (idx >= 0) stubs[idx] = { ...stubs[idx], ...next };
    else stubs.unshift(next);
    localStorage.setItem('ll_matter_stubs', JSON.stringify(stubs.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function MatterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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
    let cancelled = false;
    async function fetchMatter() {
      setLoading(true);
      try {
        const [matterRes, advocatesRes] = await Promise.all([
          apiClient<BackendMatterResponse>(`/matter/${id}`),
          apiClient<BackendAdvocatesResponse>(`/matter/${id}/advocates`),
        ]);
        if (cancelled) return;
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
      } catch {
        if (!cancelled) setError(t('shared.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchMatter();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const submitConsultation = useCallback(
    async (advocateId: string) => {
      const res = await apiClient<BackendConsultationResponse>('/consultations', {
        method: 'POST',
        body: { matterId: id, advocateId },
      });
      if (res.success && res.data) {
        setConsultationId(res.data.consultationId);
        setConsultationStatus(res.data.status === 'accepted' ? 'accepted' : 'pending');
      }
    },
    [id]
  );

  const handleRequestConsultation = useCallback(
    (advocate: Advocate) => {
      setSelectedAdvocate(advocate);
      const advocateId = advocate.id ?? advocate.advocate_id;
      if (!isAuthenticated) {
        setShowOTP(true);
      } else if (advocateId) {
        submitConsultation(advocateId);
      }
    },
    [isAuthenticated, submitConsultation]
  );

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient(`/matter/${id}/documents`, { method: 'POST', formData });
      if (res.success) {
        setUploadedDocs(prev => [...prev, { name: file.name, size: file.size }]);
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
          <h2 style={{ color: 'var(--color-navy)', marginBottom: '0.75rem' }}>
            {error || t('matter.notFound')}
          </h2>
          <Link href="/" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: '1rem' }}>
            {language === 'en' ? 'Start a new query' : 'নতুন প্রশ্ন করুন'}
          </Link>
        </div>
      </div>
    );
  }

  // Group precedence explicitly so 'accepted' && id and 'pending' && id render independently.
  const isConsultationAccepted = consultationStatus === 'accepted' && Boolean(consultationId);
  const isConsultationPending = consultationStatus === 'pending' && Boolean(consultationId);

  return (
    <div className="matter-shell">
      {showOTP && (
        <OTPModal
          onClose={() => setShowOTP(false)}
          contextMessage={
            selectedAdvocate
              ? `To request a consultation with ${selectedAdvocate.name}, please sign in or create a free account.`
              : undefined
          }
          onSuccess={() => {
            const advocateId = selectedAdvocate?.id ?? selectedAdvocate?.advocate_id;
            if (advocateId) submitConsultation(advocateId);
          }}
          redirectTo={`/matter/${id}`}
        />
      )}

      <main className="matter-container">
        {(isConsultationAccepted || isConsultationPending) && (
          <div className={`matter-status-banner ${isConsultationAccepted ? 'accepted' : 'pending'}`}>
            <span className="matter-status-icon">{isConsultationAccepted ? '✅' : '⏳'}</span>
            <div
              className="status-text"
              style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}
            >
              {isConsultationAccepted ? t('chat.consultation.accepted') : t('chat.consultation.waiting')}
            </div>
            {isConsultationAccepted && (
              <Link href={`/chat/${consultationId}`} className="matter-cta-btn" style={{ fontSize: '0.875rem' }}>
                💬 {language === 'en' ? 'Open Chat' : 'চ্যাট খুলুন'}
              </Link>
            )}
          </div>
        )}

        {/* Hero */}
        <section className="matter-hero">
          <div className="matter-hero-eyebrow">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#C9A84C',
                boxShadow: '0 0 8px #C9A84C',
              }}
            />
            {language === 'en' ? 'Matter Analysis' : 'মামলা বিশ্লেষণ'}
          </div>
          <h1
            className="matter-hero-title"
            style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}
          >
            {matter.matterType ? titleCase(matter.matterType) : t('matter.classification')}
          </h1>
          <div className="matter-hero-meta">
            {matter.statuteLabel && (
              <span className="matter-chip matter-chip-gold">
                <span aria-hidden>📖</span>
                <span>{matter.statuteLabel}</span>
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
              <span>
                {new Date(matter.createdAt).toLocaleDateString(
                  language === 'bn' ? 'bn-IN' : 'en-IN',
                  { dateStyle: 'medium' }
                )}
              </span>
            </span>
          </div>
        </section>

        {/* AI Legal Analysis */}
        <section className="matter-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #0D1B2A 0%, #1E3249 100%)',
              padding: '1.5rem 2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(201,168,76,0.18)',
                  border: '1px solid rgba(201,168,76,0.30)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.125rem',
                }}
              >
                🤖
              </div>
              <div>
                <h2
                  style={{
                    fontSize: '1.0625rem',
                    fontWeight: 700,
                    color: 'white',
                    fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
                    margin: 0,
                  }}
                >
                  {t('matter.aiResponse')}
                </h2>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                  {language === 'en' ? 'Generated by LegalLink AI' : 'LegalLink AI দ্বারা তৈরি'}
                </div>
              </div>
            </div>
            <div className="matter-tabs" style={{ background: 'rgba(255,255,255,0.08)' }}>
              {(['english', 'bengali'] as ResponseTab[]).map(tabOpt => {
                const isActive = tab === tabOpt;
                return (
                  <button
                    key={tabOpt}
                    onClick={() => setTab(tabOpt)}
                    className={`matter-tab ${isActive ? 'active' : ''}`}
                    style={{
                      color: isActive ? '#0D1B2A' : 'rgba(255,255,255,0.7)',
                      background: isActive ? '#C9A84C' : 'transparent',
                      fontFamily: tabOpt === 'bengali' ? 'var(--font-bangla)' : 'inherit',
                    }}
                  >
                    {tabOpt === 'english' ? t('matter.tab.english') : t('matter.tab.bengali')}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ padding: '2rem 2.25rem' }}>
            {matter.citations.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#6B7280',
                  }}
                >
                  {t('matter.citations')}
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {matter.citations.map((cite, i) => {
                    const label =
                      cite.citation ||
                      `${cite.source ?? ''} ${cite.section ?? ''}`.trim() ||
                      cite.title;
                    return (
                      <span
                        key={i}
                        title={cite.title}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          background: 'rgba(59,130,246,0.08)',
                          border: '1px solid rgba(59,130,246,0.2)',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: '#2563EB',
                        }}
                      >
                        📄 {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div
              className="matter-prose"
              style={{ fontFamily: tab === 'bengali' ? 'var(--font-bangla)' : 'var(--font-sans)' }}
            >
              {tab === 'english'
                ? matter.aiResponseEnglish ??
                  (language === 'en'
                    ? 'AI analysis is being processed. Please try again in a moment.'
                    : 'বিশ্লেষণ প্রক্রিয়া চলছে।')
                : matter.aiResponseBengali ?? 'বিশ্লেষণ প্রক্রিয়া চলছে।'}
            </div>

            {matter.procedural && (
              <div className="matter-callout steps">
                <span className="matter-callout-label">
                  {language === 'en' ? '📋 Procedural Steps' : '📋 আইনি পদক্ষেপ'}
                </span>
                <div style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                  {matter.procedural}
                </div>
              </div>
            )}

            {matter.nextSteps && (
              <div className="matter-callout next">
                <span className="matter-callout-label">
                  {language === 'en' ? '✅ Recommended Next Steps' : '✅ পরবর্তী পদক্ষেপ'}
                </span>
                <div style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                  {matter.nextSteps}
                </div>
              </div>
            )}

            <div
              className="matter-callout warning"
              style={{
                marginTop: '1.5rem',
                fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
              }}
            >
              ⚠️ {matter.disclaimer || t('matter.disclaimer')}
            </div>

            {/* Handoff to advocates — the visual answer to the AI's closing question */}
            {advocates.length > 0 && (
              <div
                style={{
                  marginTop: '1.75rem',
                  padding: '1.25rem 1.5rem',
                  background: 'linear-gradient(135deg, rgba(201,168,76,0.10) 0%, rgba(201,168,76,0.04) 100%)',
                  border: '1px solid rgba(201,168,76,0.30)',
                  borderRadius: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 280px' }}>
                  <div
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: 'var(--color-navy)',
                      fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
                      marginBottom: '4px',
                    }}
                  >
                    {language === 'en'
                      ? 'Ready to take this forward?'
                      : 'আপনি কি এই বিষয়টি এগিয়ে নিতে প্রস্তুত?'}
                  </div>
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      color: '#6B7280',
                      fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
                    }}
                  >
                    {language === 'en'
                      ? `${advocates.length} verified advocate${advocates.length === 1 ? '' : 's'} matched to your matter below.`
                      : `${advocates.length}জন যাচাইকৃত আইনজীবী নিচে আপনার জন্য মিলিয়েছেন।`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    document
                      .getElementById('advocates-grid')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: 'linear-gradient(135deg, #C9A84C 0%, #A0803A 100%)',
                    color: '#0D1B2A',
                    border: 'none',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    boxShadow: '0 8px 18px -6px rgba(201,168,76,0.5)',
                    fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {language === 'en' ? 'Show me advocates →' : 'আইনজীবী দেখান →'}
                </button>
              </div>
            )}
          </div>
        </section>

        {!isAuthenticated && (
          <section className="matter-cta-card">
            <div>
              <h3 style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                {t('matter.cta.title')}
              </h3>
              <p style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                {t('matter.cta.subtitle')}
              </p>
            </div>
            <button onClick={() => setShowOTP(true)} className="matter-cta-btn">
              {t('matter.cta.button')}
            </button>
          </section>
        )}

        {isAuthenticated && (
          <section className="matter-card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div className="matter-card-title" style={{ marginBottom: 0 }}>
                <div className="matter-card-title-icon">📁</div>
                <h2 style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                  {t('matter.documents')}
                </h2>
              </div>
              <button
                className="adv-action-btn secondary"
                style={{ width: 'auto', padding: '0.5rem 1.125rem', fontSize: '0.8125rem' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? '⏳ Uploading…' : `+ ${t('matter.upload')}`}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </div>
            {uploadedDocs.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '1.75rem 1rem',
                  color: '#9CA3AF',
                  fontSize: '0.9rem',
                  border: '2px dashed rgba(13,27,42,0.10)',
                  borderRadius: '1rem',
                  fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
                }}
              >
                <div style={{ fontSize: '1.75rem', marginBottom: '0.375rem', opacity: 0.5 }}>📂</div>
                {language === 'en'
                  ? 'No documents uploaded yet.'
                  : 'এখনও কোনো নথি আপলোড করা হয়নি।'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {uploadedDocs.map((doc, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.875rem',
                      padding: '0.875rem 1rem',
                      background: 'rgba(13,27,42,0.03)',
                      borderRadius: '0.75rem',
                      border: '1px solid rgba(13,27,42,0.06)',
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>📄</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-navy)' }}>
                        {doc.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>
                        {formatFileSize(doc.size)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section id="advocates-grid" style={{ marginTop: '2rem', scrollMarginTop: '5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#C9A84C',
              }}
            >
              {language === 'en' ? '⚡ MATCHED FOR YOU' : '⚡ আপনার জন্য মিলিত'}
            </span>
            <h2
              className="text-title"
              style={{
                color: 'var(--color-navy)',
                fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
                marginTop: 4,
              }}
            >
              {t('matter.advocates.title')}
            </h2>
            <p
              style={{
                color: '#6B7280',
                fontSize: '0.9375rem',
                marginTop: 4,
                fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
              }}
            >
              {t('matter.advocates.subtitle')}
            </p>
          </div>
          {advocates.length === 0 ? (
            <div
              className="matter-card"
              style={{ textAlign: 'center', color: '#9CA3AF', padding: '2.5rem' }}
            >
              {t('matter.advocates.empty')}
            </div>
          ) : (
            <div className="matter-advocate-grid">
              {advocates.slice(0, 5).map(advocate => (
                <AdvocateCard
                  key={advocate.id ?? advocate.advocate_id}
                  advocate={advocate}
                  onRequestConsultation={handleRequestConsultation}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
