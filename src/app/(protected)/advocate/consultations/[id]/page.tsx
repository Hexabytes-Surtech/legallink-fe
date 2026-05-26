'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiClient } from '@/lib/api/client';
import { USE_MOCK, mockDelay } from '@/data/mock';
import type { AdvocateConsultation } from '@/types';

type ResponseTab = 'english' | 'bengali';

export default function AdvocateConsultationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [consultation, setConsultation] = useState<AdvocateConsultation | null>(null);
  const [tab, setTab] = useState<ResponseTab>('english');

  // Action states
  const [submittingAction, setSubmittingAction] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  // Mock Citizen Documents
  const [citizenDocuments] = useState([
    { name: 'rental_agreement_signed.pdf', size: 1420000 },
    { name: 'landlord_whatsapp_chats.png', size: 680000 },
  ]);

  useEffect(() => {
    async function loadConsultation() {
      setLoading(true);
      setError('');
      try {
        if (USE_MOCK) {
          await mockDelay(600);
          const cached = localStorage.getItem('mock_advocate_consultations');
          let found: AdvocateConsultation | undefined;
          
          if (cached) {
            const list: AdvocateConsultation[] = JSON.parse(cached);
            found = list.find(c => c.id === id);
          }

          if (!found) {
            // Check if it's one of our expected default consultations
            const defaults: Record<string, AdvocateConsultation> = {
              'cons-mock-1': {
                id: 'cons-mock-1',
                status: 'pending',
                requested_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
                query_text: 'My landlord locked me out of my apartment and is withholding my security deposit. I need immediate advice.',
                query_language: 'en',
                classification: {
                  matterType: 'Tenancy & Housing',
                  statute: 'West Bengal Premises Tenancy Act, 1997',
                  userQuestion: 'Can a landlord lock out a tenant without a court order?',
                  involvesPolice: false,
                  location: 'Salt Lake, Kolkata',
                },
                citizen_user_id: 'citizen-101',
              },
              'cons-mock-2': {
                id: 'cons-mock-2',
                status: 'accepted',
                requested_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
                accepted_at: new Date(Date.now() - 2.8 * 3600 * 1000).toISOString(),
                query_text: 'My employer did not pay salary for March and April and terminated me verbally when I asked.',
                query_language: 'en',
                classification: {
                  matterType: 'Labour & Employment',
                  statute: 'Payment of Wages Act, 1936',
                  userQuestion: 'Is verbal termination legal and how to claim wages?',
                  involvesPolice: false,
                  location: 'Sector V, Kolkata',
                },
                citizen_user_id: 'citizen-102',
              },
            };
            found = defaults[id];
          }

          if (found) {
            // Fill AI analysis and citations if missing (so it is beautiful)
            if (!found.ai_response_english) {
              found.ai_response_english = `Based on the details provided, the action taken against you appears to violate local and statutory regulations.

### Key Points of Concern:
1. **Unlawful Action**: The actions described (withholding properties/salary or lockout) violate primary contractual and statutory protections.
2. **Immediate Redressal**: You are entitled to claim restitution, compensation, or immediate injunction orders from the appropriate tribunal.
3. **Statutory Application**: This matter directly falls within specialized legislation. Appropriate notice must be drafted and served.

### Recommended Strategy:
- Send a formal legal notice demanding immediate rectification.
- Collect all supporting logs, records, receipts, and agreements.
- If unresponsive within 7 days, initiate formal proceedings in the local court.`;
            }
            if (!found.ai_response_bengali) {
              found.ai_response_bengali = `প্রদত্ত বিবরণীর ভিত্তিতে, আপনার বিরুদ্ধে নেওয়া পদক্ষেপটি স্থানীয় এবং সংবিধিবদ্ধ নিয়ম লঙ্ঘন করে বলে মনে হচ্ছে।

### উদ্বেগের মূল বিষয়গুলি:
১. **বেআইনি পদক্ষেপ**: বর্ণিত ক্রিয়াকলাপগুলি (সম্পত্তি বা বেতন আটকে রাখা বা লকআউট) প্রাথমিক চুক্তিভিত্তিক এবং আইনি সুরক্ষা লঙ্ঘন করে।
২. **তাৎক্ষণিক প্রতিকার**: আপনি উপযুক্ত ট্রাইব্যুনাল থেকে ক্ষতিপূরণ বা জরুরি নিষেধাজ্ঞার আদেশ দাবি করার অধিকারী।
৩. **আইনি প্রয়োগ**: এই বিষয়টি সরাসরি বিশেষায়িত আইনের আওতায় পড়ে। উপযুক্ত আইনি নোটিশ খসড়া করে পাঠাতে হবে।

### প্রস্তাবিত কৌশল:
- অবিলম্বে প্রতিকার দাবি করে একটি আনুষ্ঠানিক আইনি নোটিশ পাঠান।
- সমস্ত নথি, রসিদ এবং চুক্তিপত্র সংগ্রহ করুন।
- যদি ৭ দিনের মধ্যে কোনো সাড়া না পাওয়া যায়, তবে দেওয়ানি বা শ্রম আদালতে আনুষ্ঠানিক মামলা দায়ের করুন।`;
            }
            if (!found.citations) {
              found.citations = [
                {
                  title: found.classification.statute || 'Relevant Statute of West Bengal',
                  section: 'Section Section 15 & 19 — Protection of Tenant/Employee Rights',
                  url: 'https://indiacode.nic.in',
                  type: 'statute',
                },
                {
                  title: 'Calcutta High Court Landmark Precedent (2021)',
                  section: 'Injunction on illegal summary locks and withholding dues',
                  type: 'judgment',
                },
              ];
            }
            setConsultation(found);
          } else {
            setError(language === 'en' ? 'Consultation not found.' : 'পরামর্শ খুঁজে পাওয়া যায়নি।');
          }
        } else {
          const res = await apiClient<AdvocateConsultation>(`/advocate/consultations/${id}`);
          if (res.success && res.data) {
            setConsultation(res.data);
          } else {
            throw new Error(res.error || 'Failed to load consultation details.');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching consultation detail.');
      } finally {
        setLoading(false);
      }
    }

    loadConsultation();
  }, [id, language]);

  // Accept Handler
  async function handleAccept() {
    if (!consultation) return;
    setError('');
    setSubmittingAction(true);
    try {
      if (USE_MOCK) {
        await mockDelay(500);
        const updated = {
          ...consultation,
          status: 'accepted' as const,
          accepted_at: new Date().toISOString(),
        };
        setConsultation(updated);

        // Update local list
        const cached = localStorage.getItem('mock_advocate_consultations');
        if (cached) {
          const list: AdvocateConsultation[] = JSON.parse(cached);
          const idx = list.findIndex(c => c.id === id);
          if (idx !== -1) {
            list[idx] = updated;
          } else {
            list.push(updated);
          }
          localStorage.setItem('mock_advocate_consultations', JSON.stringify(list));
        }
      } else {
        const res = await apiClient<{ status: string }>(`/advocate/consultations/${id}`, {
          method: 'PUT',
          body: { action: 'accept' },
        });
        if (res.success) {
          setConsultation(prev => prev ? { ...prev, status: 'accepted', accepted_at: new Date().toISOString() } : null);
        } else {
          throw new Error(res.error || 'Failed to accept consultation.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept consultation.');
    } finally {
      setSubmittingAction(false);
    }
  }

  // Decline Handler
  async function handleDeclineSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consultation) return;
    setError('');
    setSubmittingAction(true);
    setDeclineModalOpen(false);

    try {
      if (USE_MOCK) {
        await mockDelay(500);
        const updated = {
          ...consultation,
          status: 'declined' as const,
          decline_reason: declineReason,
        };
        setConsultation(updated);

        // Update local list
        const cached = localStorage.getItem('mock_advocate_consultations');
        if (cached) {
          const list: AdvocateConsultation[] = JSON.parse(cached);
          const idx = list.findIndex(c => c.id === id);
          if (idx !== -1) {
            list[idx] = updated;
          } else {
            list.push(updated);
          }
          localStorage.setItem('mock_advocate_consultations', JSON.stringify(list));
        }
      } else {
        const res = await apiClient<{ status: string }>(`/advocate/consultations/${id}`, {
          method: 'PUT',
          body: { action: 'decline', declineReason },
        });
        if (res.success) {
          setConsultation(prev => prev ? { ...prev, status: 'declined' } : null);
        } else {
          throw new Error(res.error || 'Failed to decline consultation.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline consultation.');
    } finally {
      setSubmittingAction(false);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '2rem', width: '20%', marginBottom: '1.5rem' }} />
        <div className="skeleton" style={{ height: '4rem', width: '80%', marginBottom: '2.5rem' }} />
        <div className="skeleton" style={{ height: '350px', borderRadius: '1.25rem', marginBottom: '2rem' }} />
        <div className="skeleton" style={{ height: '180px', borderRadius: '1.25rem' }} />
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h3 style={{ color: 'var(--color-navy)', fontSize: '1.25rem', fontWeight: 700 }}>
          {error || (language === 'en' ? 'Consultation request not found.' : 'পরামর্শের অনুরোধ খুঁজে পাওয়া যায়নি।')}
        </h3>
        <Link href="/advocate/consultations" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: '1.5rem' }}>
          {language === 'en' ? 'Back to Consultations' : 'পরামর্শ তালিকায় ফিরে যান'}
        </Link>
      </div>
    );
  }

  const status = consultation.status;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '3rem' }}>
      <style>{`
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-gray-500);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
          transition: color 0.2s;
        }
        .back-link:hover {
          color: #0D1B2A;
        }
        .header-section {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 1.25rem;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
        }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #F3F4F6;
        }
        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .meta-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #9CA3AF;
        }
        .meta-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-navy);
        }
        .info-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 1.25rem;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 25px rgba(0,0,0,0.01);
        }
        .query-box {
          background: #FAF9F6;
          border-left: 4px solid #C9A84C;
          padding: 1.25rem 1.5rem;
          border-radius: 0 0.75rem 0.75rem 0;
          font-size: 1.1rem;
          line-height: 1.6;
          color: var(--color-navy);
          font-weight: 500;
          margin-bottom: 2rem;
        }
        .tab-bar {
          display: flex;
          background: #F3F4F6;
          border-radius: 0.625rem;
          padding: 3px;
          gap: 2px;
          margin-bottom: 1.25rem;
          width: fit-content;
        }
        .tab-btn {
          border: none;
          background: none;
          padding: 0.4rem 1.25rem;
          border-radius: 0.5rem;
          font-size: 0.85rem;
          font-weight: 700;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn.active {
          background: #0D1B2A;
          color: white;
        }
        .citation-item {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.875rem;
          background: rgba(13,27,42,0.04);
          border: 1px solid rgba(13,27,42,0.08);
          border-radius: 9999px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-navy);
          text-decoration: none;
          transition: all 0.2s;
        }
        .citation-item:hover {
          background: rgba(201,168,76,0.1);
          border-color: #C9A84C;
          color: #8C7026;
        }
        .doc-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: #FAF9F6;
          border: 1px solid #E5E7EB;
          border-radius: 0.75rem;
          transition: all 0.2s;
        }
        .doc-item:hover {
          border-color: #C9A84C;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(13,27,42,0.6);
          backdrop-filter: blur(5px);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .decline-modal {
          background: white;
          border-radius: 1.25rem;
          padding: 2rem;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 20px 50px rgba(0,0,0,0.25);
        }
      `}</style>

      <Link href="/advocate/consultations" className="back-link">
        ← {language === 'en' ? 'Back to Consultations' : 'পরামর্শ তালিকায় ফিরে যান'}
      </Link>

      {/* Header section with Actions */}
      <div className="header-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className={`badge ${status === 'pending' ? 'badge-navy' : status === 'accepted' ? 'badge-green' : 'badge-red'}`} style={{ textTransform: 'capitalize', fontSize: '0.75rem', fontWeight: 700 }}>
                {status === 'pending' ? 'Pending Approval' : status}
              </span>
              <span style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>
                Ref: {consultation.id}
              </span>
            </div>
            <h1 className="text-headline" style={{ color: 'var(--color-navy)', marginTop: '0.75rem', marginBottom: 0 }}>
              {language === 'en' ? 'Consultation File' : 'পরামর্শের ফাইল'}
            </h1>
          </div>

          {/* Action buttons based on status */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {status === 'pending' && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDeclineModalOpen(true)}
                  disabled={submittingAction}
                  style={{ borderColor: '#EF4444', color: '#EF4444', height: '42px' }}
                >
                  {language === 'en' ? 'Decline Request' : 'প্রত্যাখ্যান করুন'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAccept}
                  disabled={submittingAction}
                  style={{ background: 'linear-gradient(to right, #059669, #10B981)', borderColor: '#059669', color: 'white', fontWeight: 700, height: '42px' }}
                >
                  {language === 'en' ? 'Accept & Open Case' : 'গ্রহণ করুন এবং কেস খুলুন'}
                </button>
              </>
            )}

            {status === 'accepted' && (
              <Link
                href={`/chat/${consultation.id}`}
                className="btn btn-primary"
                style={{ background: 'linear-gradient(to right, #C9A84C, #E2C475)', borderColor: '#C9A84C', color: '#0D1B2A', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: '42px' }}
              >
                💬 {language === 'en' ? 'Go to Chat Room' : 'চ্যাট রুমে যান'}
              </Link>
            )}

            {status === 'declined' && (
              <span style={{ color: '#EF4444', fontWeight: 700, padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.08)', borderRadius: '0.5rem', fontSize: '0.9rem' }}>
                🚫 {language === 'en' ? 'Declined' : 'প্রত্যাখ্যাত'}
              </span>
            )}
            
            {status === 'closed' && (
              <span style={{ color: '#6B7280', fontWeight: 700, padding: '0.5rem 1rem', background: '#F3F4F6', borderRadius: '0.5rem', fontSize: '0.9rem' }}>
                📁 {language === 'en' ? 'Closed' : 'বন্ধ করা হয়েছে'}
              </span>
            )}
          </div>
        </div>

        {/* Metadata grid */}
        <div className="meta-grid">
          <div className="meta-item">
            <span className="meta-label">{language === 'en' ? 'Client ID' : 'মক্কেল আইডি'}</span>
            <span className="meta-value">{consultation.citizen_user_id}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">{language === 'en' ? 'Date Requested' : 'আবেদনের তারিখ'}</span>
            <span className="meta-value">
              {new Date(consultation.requested_at).toLocaleDateString(language === 'bn' ? 'bn-IN' : 'en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">{language === 'en' ? 'Query Language' : 'প্রশ্নের ভাষা'}</span>
            <span className="meta-value" style={{ textTransform: 'uppercase' }}>
              {consultation.query_language === 'bn' ? 'Bengali (বাংলা)' : 'English'}
            </span>
          </div>
          {consultation.accepted_at && (
            <div className="meta-item">
              <span className="meta-label">{language === 'en' ? 'Accepted On' : 'গৃহীত হয়েছে'}</span>
              <span className="meta-value">
                {new Date(consultation.accepted_at).toLocaleDateString(language === 'bn' ? 'bn-IN' : 'en-IN', {
                  dateStyle: 'medium',
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main consultation details */}
      <div className="info-card">
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '1rem' }}>
          {language === 'en' ? 'Original Consultation Query' : 'মূল পরামর্শের প্রশ্ন'}
        </h2>
        <div className="query-box">
          &ldquo;{consultation.query_text}&rdquo;
        </div>

        {/* Matter classification */}
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {language === 'en' ? 'AI Classification Tags' : 'এআই ক্লাসিফিকেশন ট্যাগ'}
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2.5rem' }}>
          {consultation.classification.matterType && (
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '4px' }}>Matter Type</div>
              <span className="badge badge-navy" style={{ fontSize: '0.85rem' }}>{consultation.classification.matterType}</span>
            </div>
          )}
          {consultation.classification.statute && (
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '4px' }}>Statute</div>
              <span className="badge badge-blue" style={{ fontSize: '0.85rem' }}>{consultation.classification.statute}</span>
            </div>
          )}
          {consultation.classification.location && (
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '4px' }}>Location</div>
              <span className="badge badge-gray" style={{ fontSize: '0.85rem' }}>📍 {consultation.classification.location}</span>
            </div>
          )}
        </div>

        {/* AI Analysis response */}
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-navy)', margin: 0 }}>
              {language === 'en' ? 'AI-Generated Preliminary Analysis' : 'এআই-দ্বারা প্রস্তুত প্রাথমিক বিশ্লেষণ'}
            </h2>
            <div className="tab-bar">
              <button className={`tab-btn ${tab === 'english' ? 'active' : ''}`} onClick={() => setTab('english')}>
                {language === 'en' ? 'English' : 'ইংরেজি'}
              </button>
              <button className={`tab-btn ${tab === 'bengali' ? 'active' : ''}`} onClick={() => setTab('bengali')}>
                {language === 'en' ? 'Bengali (বাংলা)' : 'বাংলা'}
              </button>
            </div>
          </div>

          <div style={{
            fontSize: '1rem',
            lineHeight: '1.75',
            color: '#374151',
            whiteSpace: 'pre-wrap',
            fontFamily: tab === 'bengali' ? 'var(--font-bangla)' : 'var(--font-sans)',
            background: '#FAF9F6',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            border: '1px solid #E5E7EB',
            marginBottom: '1.5rem'
          }}>
            {tab === 'english' ? consultation.ai_response_english : consultation.ai_response_bengali}
          </div>

          {/* Citations list */}
          {consultation.citations && consultation.citations.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '0.625rem', letterSpacing: '0.05em' }}>
                {language === 'en' ? 'Recommended Legal Citations' : 'প্রস্তাবিত আইনি উদ্ধৃতি'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {consultation.citations.map((cite, i) => (
                  <a
                    key={i}
                    href={cite.url || '#'}
                    target={cite.url ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="citation-item"
                  >
                    📄 {cite.title}{cite.section ? ` — ${cite.section}` : ''} {cite.url && <span>↗</span>}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Citizen Uploaded Documents */}
      <div className="info-card">
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>
          {language === 'en' ? 'Client Supporting Documents' : 'মক্কেলের আপলোড করা নথি'}
        </h2>
        <p style={{ color: 'var(--color-gray-400)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          {language === 'en' ? 'Verification files uploaded by the citizen client regarding this dispute.' : 'এই বিরোধ সম্পর্কিত নাগরিকের আপলোড করা সহায়ক প্রমাণাদি।'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {citizenDocuments.map((doc, idx) => (
            <div key={idx} className="doc-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>📄</span>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-navy)' }}>{doc.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>{formatFileSize(doc.size)}</div>
                </div>
              </div>
              <a
                href="#"
                onClick={e => { e.preventDefault(); alert('Download starting (Mock Mode)...'); }}
                className="btn btn-ghost btn-sm"
                style={{ color: '#C9A84C', fontWeight: 700 }}
              >
                📥 {language === 'en' ? 'Download' : 'ডাউনলোড'}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Decline Reason Modal */}
      {declineModalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeclineModalOpen(false)}>
          <div className="decline-modal">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '1rem' }}>
              {language === 'en' ? 'Decline Consultation Request' : 'পরামর্শের অনুরোধ প্রত্যাখ্যান করুন'}
            </h3>
            <form onSubmit={handleDeclineSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="decline-reason" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Please provide a reason (optional)' : 'অনুগ্রহ করে একটি কারণ লিখুন (ঐচ্ছিক)'}
                </label>
                <textarea
                  id="decline-reason"
                  className="input"
                  rows={4}
                  placeholder={language === 'en' ? 'Schedule conflict, field outside specialization, etc.' : 'সময়ের সমস্যা, বিশেষীকরণের বাইরের ক্ষেত্র, ইত্যাদি।'}
                  value={declineReason}
                  onChange={e => setDeclineReason(e.target.value)}
                  style={{ padding: '0.75rem', width: '100%', resize: 'none', borderRadius: '0.5rem', border: '1px solid #D1D5DB' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setDeclineModalOpen(false)} disabled={submittingAction}>
                  {language === 'en' ? 'Cancel' : 'বাতিল'}
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#EF4444', borderColor: '#EF4444', color: 'white', fontWeight: 600 }} disabled={submittingAction}>
                  {language === 'en' ? 'Decline Request' : 'প্রত্যাখ্যান করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
