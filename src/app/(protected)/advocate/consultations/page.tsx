'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiClient } from '@/lib/api/client';
import { USE_MOCK, mockDelay } from '@/data/mock';
import type { AdvocateConsultation } from '@/types';

export default function ConsultationsListPage() {
  const { language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [consultations, setConsultations] = useState<AdvocateConsultation[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'all'>('pending');

  // Decline Modal state
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [selectedConsId, setSelectedConsId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    async function loadConsultations() {
      setLoading(true);
      setError('');
      try {
        if (USE_MOCK) {
          await mockDelay(600);
          const cached = localStorage.getItem('mock_advocate_consultations');
          if (cached) {
            setConsultations(JSON.parse(cached));
          } else {
            const defaultConsultations: AdvocateConsultation[] = [
              {
                id: 'cons-mock-1',
                status: 'requested',
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
              {
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
              {
                id: 'cons-mock-3',
                status: 'declined',
                requested_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
                query_text: 'A domestic violence issue within the family, looking for counseling and protection order.',
                query_language: 'en',
                classification: {
                  matterType: 'Family Law',
                  statute: 'Protection of Women from Domestic Violence Act, 2005',
                  userQuestion: 'How to apply for protection order?',
                  involvesPolice: true,
                  location: 'Howrah, WB',
                },
                citizen_user_id: 'citizen-103',
              },
            ];
            setConsultations(defaultConsultations);
            localStorage.setItem('mock_advocate_consultations', JSON.stringify(defaultConsultations));
          }
        } else {
          const res = await apiClient<AdvocateConsultation[]>('/advocate/consultations');
          if (res.success && res.data) {
            setConsultations(res.data);
          } else {
            throw new Error(res.error || 'Failed to fetch consultations.');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading consultations.');
      } finally {
        setLoading(false);
      }
    }

    loadConsultations();
  }, []);

  // Accept Consultation Handler
  async function handleAccept(id: string) {
    setError('');
    setSubmittingAction(true);
    try {
      if (USE_MOCK) {
        await mockDelay(400);
        const updated = consultations.map(c => {
          if (c.id === id) {
            return { ...c, status: 'accepted' as const, accepted_at: new Date().toISOString() };
          }
          return c;
        });
        setConsultations(updated);
        localStorage.setItem('mock_advocate_consultations', JSON.stringify(updated));
      } else {
        const res = await apiClient<{ status: string }>('/advocate/consultations/' + id, {
          method: 'PUT',
          body: { action: 'accept' },
        });
        if (res.success) {
          setConsultations(prev =>
            prev.map(c => (c.id === id ? { ...c, status: 'accepted' as const, accepted_at: new Date().toISOString() } : c))
          );
        } else {
          throw new Error(res.error || 'Could not accept consultation request.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept consultation.');
    } finally {
      setSubmittingAction(false);
    }
  }

  // Open Decline Modal
  function openDeclineModal(id: string) {
    setSelectedConsId(id);
    setDeclineReason('');
    setDeclineModalOpen(true);
  }

  // Submit Decline Action
  async function handleDeclineSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConsId) return;
    setError('');
    setSubmittingAction(true);
    setDeclineModalOpen(false);

    try {
      if (USE_MOCK) {
        await mockDelay(400);
        const updated = consultations.map(c => {
          if (c.id === selectedConsId) {
            return { ...c, status: 'declined' as const, decline_reason: declineReason };
          }
          return c;
        });
        setConsultations(updated);
        localStorage.setItem('mock_advocate_consultations', JSON.stringify(updated));
      } else {
        const res = await apiClient<{ status: string }>('/advocate/consultations/' + selectedConsId, {
          method: 'PUT',
          body: { action: 'decline', declineReason },
        });
        if (res.success) {
          setConsultations(prev =>
            prev.map(c => (c.id === selectedConsId ? { ...c, status: 'declined' as const, decline_reason: declineReason } : c))
          );
        } else {
          throw new Error(res.error || 'Could not decline consultation request.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline consultation.');
    } finally {
      setSubmittingAction(false);
      setSelectedConsId(null);
    }
  }

  // Filter based on selected tab
  const filteredConsultations = consultations.filter(c => {
    if (activeTab === 'pending') return c.status === 'requested';
    if (activeTab === 'active') return c.status === 'accepted';
    return true; // 'all'
  });

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: '3.5rem', width: '30%', marginBottom: '2.5rem' }} />
        <div className="skeleton" style={{ height: '50px', borderRadius: '0.5rem', marginBottom: '1.5rem' }} />
        <div className="skeleton" style={{ height: '180px', borderRadius: '1rem', marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: '180px', borderRadius: '1rem' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <style>{`
        .tabs-header {
          display: flex;
          border-bottom: 2px solid #E5E7EB;
          margin-bottom: 2rem;
          gap: 1.5rem;
        }
        .tab-btn {
          border: none;
          background: none;
          padding: 0.75rem 0.5rem;
          font-size: 1rem;
          font-weight: 700;
          color: #6B7280;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }
        .tab-btn:hover { color: #0D1B2A; }
        .tab-btn.active {
          color: #0D1B2A;
        }
        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 3px;
          background: #C9A84C;
        }
        .consultation-card {
          background: white;
          border-radius: 1.25rem;
          border: 1px solid #E5E7EB;
          padding: 2rem;
          margin-bottom: 1.5rem;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
        }
        .consultation-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 35px rgba(0,0,0,0.04);
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
          animation: fadeInScale 0.2s ease;
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="text-headline" style={{ color: 'var(--color-navy)', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
            {language === 'en' ? 'Consultation Requests' : 'পরামর্শের অনুরোধসমূহ'}
          </h1>
          <p style={{ color: 'var(--color-gray-500)', fontSize: '1.05rem', marginTop: '0.25rem' }}>
            {language === 'en'
              ? 'Review matching requests from citizens looking for advice in your area of practice.'
              : 'আপনার অনুশীলনের ক্ষেত্রে পরামর্শের জন্য নাগরিকদের কাছ থেকে আসা অনুরোধগুলি পর্যালোচনা করুন।'}
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="tabs-header">
        <button className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
          {language === 'en' ? 'Pending Requests' : 'পেন্ডিং অনুরোধ'}
          <span style={{ fontSize: '0.8rem', background: 'rgba(13,27,42,0.08)', padding: '2px 8px', borderRadius: '9999px', marginLeft: '0.5rem' }}>
            {consultations.filter(c => c.status === 'requested').length}
          </span>
        </button>
        <button className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
          {language === 'en' ? 'Active Consultations' : 'সক্রিয় কেস'}
          <span style={{ fontSize: '0.8rem', background: 'rgba(13,27,42,0.08)', padding: '2px 8px', borderRadius: '9999px', marginLeft: '0.5rem' }}>
            {consultations.filter(c => c.status === 'accepted').length}
          </span>
        </button>
        <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
          {language === 'en' ? 'All Requests' : 'সব অনুরোধ'}
        </button>
      </div>

      {/* Consultations List */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filteredConsultations.map(cons => {
          const status = cons.status;
          return (
            <div key={cons.id} className="consultation-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {cons.classification?.matterType && (
                    <span className="badge badge-navy" style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700 }}>
                      {cons.classification.matterType}
                    </span>
                  )}
                  {cons.classification?.location && (
                    <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>
                      📍 {cons.classification.location}
                    </span>
                  )}
                  <span className={`badge ${status === 'requested' ? 'badge-navy' : status === 'accepted' ? 'badge-green' : 'badge-red'}`} style={{ textTransform: 'capitalize', fontSize: '0.7rem', fontWeight: 700 }}>
                    {status === 'requested' ? 'pending approval' : status}
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>
                  Requested: {new Date(cons.requested_at).toLocaleDateString(language === 'bn' ? 'bn-IN' : 'en-IN', { dateStyle: 'medium' })}
                </span>
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-navy)', lineHeight: 1.5, marginBottom: '1rem' }}>
                &ldquo;{cons.query_text}&rdquo;
              </h3>

              {cons.classification?.statute && (
                <div style={{ display: 'flex', gap: '0.25rem', fontSize: '0.85rem', color: '#6B7280', marginBottom: '1.5rem' }}>
                  <span style={{ fontWeight: 600 }}>Statute:</span>
                  <span>{cons.classification.statute}</span>
                </div>
              )}

              {/* Action Area */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid #F3F4F6', paddingTop: '1.25rem' }}>
                <Link href={`/advocate/consultations/${cons.id}`} className="btn btn-secondary btn-sm" style={{ fontWeight: 600 }}>
                  {language === 'en' ? 'View Details' : 'বিস্তারিত দেখুন'}
                </Link>

                {status === 'requested' && (
                  <>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => openDeclineModal(cons.id)} disabled={submittingAction} style={{ borderColor: '#EF4444', color: '#EF4444' }}>
                      {language === 'en' ? 'Decline' : 'প্রত্যাখ্যান করুন'}
                    </button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => handleAccept(cons.id)} disabled={submittingAction} style={{ background: 'linear-gradient(to right, #059669, #10B981)', borderColor: '#059669', color: 'white', fontWeight: 600 }}>
                      {language === 'en' ? 'Accept Request' : 'অনুরোধ গ্রহণ করুন'}
                    </button>
                  </>
                )}

                {status === 'accepted' && (
                  <Link href={`/chat/${cons.id}`} className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(to right, #C9A84C, #E2C475)', borderColor: '#C9A84C', color: '#0D1B2A', fontWeight: 700 }}>
                    💬 {language === 'en' ? 'Enter Chat Room' : 'চ্যাট রুমে প্রবেশ করুন'}
                  </Link>
                )}
              </div>
            </div>
          );
        })}

        {filteredConsultations.length === 0 && (
          <div style={{ background: 'white', border: '1px dashed #E5E7EB', borderRadius: '1rem', padding: '5rem 2rem', textAlign: 'center', color: '#9CA3AF' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📥</span>
            <p style={{ fontWeight: 600, margin: 0, fontSize: '1.05rem' }}>
              {activeTab === 'pending'
                ? (language === 'en' ? 'No pending requests available.' : 'কোনো পেন্ডিং অনুরোধ নেই।')
                : activeTab === 'active'
                  ? (language === 'en' ? 'No active consultations.' : 'কোনো সক্রিয় পরামর্শ নেই।')
                  : (language === 'en' ? 'No consultation requests found.' : 'কোনো অনুরোধ পাওয়া যায়নি।')}
            </p>
          </div>
        )}
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
                <textarea id="decline-reason" className="input" rows={4} placeholder={language === 'en' ? 'Schedule conflict, field outside specialization, etc.' : 'সময়ের সমস্যা, বিশেষীকরণের বাইরের ক্ষেত্র, ইত্যাদি।'} value={declineReason} onChange={e => setDeclineReason(e.target.value)} style={{ padding: '0.75rem', width: '100%', resize: 'none' }} />
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
