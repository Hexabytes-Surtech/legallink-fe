'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';
import { USE_MOCK, mockDelay } from '@/data/mock';
import type { Advocate, AdvocateConsultation } from '@/types';

interface DashboardData {
  verificationStatus: 'pending' | 'verified' | 'rejected';
  profileCompleteness: number;
  consultationStats: {
    pending_count: string | number;
    accepted_count: string | number;
    declined_count: string | number;
    closed_count: string | number;
    total_count: string | number;
  };
}

export default function AdvocateDashboardPage() {
  const { language } = useLanguage();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [advocate, setAdvocate] = useState<Advocate | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [recentConsultations, setRecentConsultations] = useState<AdvocateConsultation[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        if (USE_MOCK) {
          await mockDelay(600);

          // Get profile from localStorage
          const localProfile = localStorage.getItem('mock_advocate_profile');
          let profile: Advocate;
          if (localProfile) {
            profile = JSON.parse(localProfile);
          } else {
            profile = {
              name: 'John Doe',
              address: '',
              phone: '',
              verification_status: 'pending',
              auth_email: user?.email,
              courts: [],
              languages: ['en'],
              districts: [],
            };
          }
          setAdvocate(profile);

          // Get consultations
          const cachedConsultations = localStorage.getItem('mock_advocate_consultations');
          let consultations: AdvocateConsultation[] = [];
          if (cachedConsultations) {
            consultations = JSON.parse(cachedConsultations);
          } else {
            consultations = [
              {
                id: 'cons-mock-1',
                status: 'requested',
                requested_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
                query_text: 'My landlord locked me out of my apartment and is withholding my deposit.',
                query_language: 'en',
                classification: {
                  matterType: 'Tenancy & Housing',
                  statute: 'Premises Eviction Act',
                  userQuestion: 'Can I sue my landlord?',
                  involvesPolice: false,
                  location: 'Kolkata, WB',
                },
                citizen_user_id: 'citizen-11',
              },
              {
                id: 'cons-mock-2',
                status: 'accepted',
                requested_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours ago
                accepted_at: new Date(Date.now() - 1.8 * 3600 * 1000).toISOString(),
                query_text: 'Employment contract terminated without pay or notice period.',
                query_language: 'en',
                classification: {
                  matterType: 'Labour & Employment',
                  statute: 'Payment of Wages Act',
                  userQuestion: 'How to recover unpaid salary?',
                  involvesPolice: false,
                  location: 'Howrah, WB',
                },
                citizen_user_id: 'citizen-12',
              },
            ];
            localStorage.setItem('mock_advocate_consultations', JSON.stringify(consultations));
          }

          // Calculate counts
          const total = consultations.length;
          const pending = consultations.filter(c => c.status === 'requested').length;
          const accepted = consultations.filter(c => c.status === 'accepted').length;
          const declined = consultations.filter(c => c.status === 'declined').length;
          const closed = consultations.filter(c => c.status === 'closed').length;

          // Calculate completeness
          const fields = [profile.name, profile.phone, profile.address, profile.bar_enrolment_number || profile.barEnrolmentNumber, profile.state_bar || profile.stateBar];
          const completedFields = fields.filter(Boolean).length;
          const completeness = Math.round((completedFields / fields.length) * 100);

          setDashboardData({
            verificationStatus: profile.verification_status || 'pending',
            profileCompleteness: completeness,
            consultationStats: {
              pending_count: pending,
              accepted_count: accepted,
              declined_count: declined,
              closed_count: closed,
              total_count: total,
            },
          });

          setRecentConsultations(consultations.slice(0, 5));
        } else {
          // Real Mode API Calls
          const profileRes = await apiClient<Advocate>('/advocate/me');
          if (profileRes.success && profileRes.data) {
            setAdvocate(profileRes.data);
          }

          const dashRes = await apiClient<DashboardData>('/advocate/dashboard');
          if (dashRes.success && dashRes.data) {
            setDashboardData(dashRes.data);
          }

          const consultationsRes = await apiClient<AdvocateConsultation[]>('/advocate/consultations');
          if (consultationsRes.success && consultationsRes.data) {
            setRecentConsultations(consultationsRes.data.slice(0, 5));
          }
        }
      } catch {
        setError(language === 'en' ? 'Could not load dashboard statistics.' : 'ড্যাশবোর্ড পরিসংখ্যান লোড করা যায়নি।');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [user, language]);

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: '3.5rem', width: '35%', marginBottom: '2rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '1rem' }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: '300px', borderRadius: '1.25rem' }} />
      </div>
    );
  }

  const stats = dashboardData?.consultationStats;
  const status = dashboardData?.verificationStatus || advocate?.verification_status || 'pending';
  const completeness = dashboardData?.profileCompleteness ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#DC2626', padding: '1rem 1.25rem', borderRadius: '0.875rem', fontSize: '0.9rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
          ⚠️ {error}
        </div>
      )}
      <style>{`
        .welcome-card {
          background: linear-gradient(135deg, #0D1B2A 0%, #1B2E43 100%);
          border-radius: 1.25rem;
          padding: 2.5rem;
          color: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 15px 40px rgba(13,27,42,0.15);
          border: 1px solid rgba(201,168,76,0.25);
        }
        .welcome-pattern {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 90% 10%, rgba(201,168,76,0.12) 0%, transparent 40%);
          pointer-events: none;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.25rem;
        }
        .stat-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          border: 1px solid #E5E7EB;
          transition: all 0.2s;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.05);
          border-color: #C9A84C;
        }
        .alert-banner {
          border-radius: 0.75rem;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          font-weight: 500;
          line-height: 1.5;
        }
        .alert-pending {
          background: rgba(201, 168, 76, 0.08);
          border: 1px solid rgba(201, 168, 76, 0.25);
          color: #A0803A;
        }
        .alert-verified {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #059669;
        }
        .alert-rejected {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #DC2626;
        }
        .section-card {
          background: white;
          border-radius: 1.25rem;
          padding: 2rem;
          box-shadow: 0 4px 30px rgba(0,0,0,0.02);
          border: 1px solid #E5E7EB;
        }
        .list-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 0;
          border-bottom: 1px solid #F3F4F6;
        }
        .list-row:last-child { border-bottom: none; }
      `}</style>

      {/* Welcome Banner */}
      <div className="welcome-card">
        <div className="welcome-pattern" />
        <span style={{
          background: 'rgba(201,168,76,0.15)',
          color: '#E2C475',
          border: '1px solid rgba(201,168,76,0.3)',
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          display: 'inline-block',
          marginBottom: '1rem',
        }}>
          {language === 'en' ? 'Console Access' : 'কনসোল অ্যাক্সেস'}
        </span>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
          {language === 'en' ? `Welcome back, Adv. ${advocate?.name || ''}` : `স্বাগতম, অ্যাডভোকেট ${advocate?.name || ''}`}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', marginTop: '0.5rem', marginBottom: 0 }}>
          {language === 'en'
            ? 'Manage your legal consultation requests, track verifications, and communicate with clients.'
            : 'আপনার আইনি পরামর্শের অনুরোধগুলি পরিচালনা করুন, ভেরিফিকেশন ট্র্যাক করুন এবং মক্কেলদের সাথে চ্যাট করুন।'}
        </p>
      </div>

      {/* Verification Status Banner Alerts */}
      {status === 'pending' && (
        <div className="alert-banner alert-pending">
          <span style={{ fontSize: '1.25rem' }}>⏳</span>
          <div>
            <div style={{ fontWeight: 700 }}>{language === 'en' ? 'Verification Request Under Review' : 'যাচাইকরণের অনুরোধ প্রক্রিয়াধীন আছে'}</div>
            <div style={{ fontSize: '0.875rem', marginTop: '0.15rem' }}>
              {language === 'en'
                ? 'Your professional profile is under review by the administrator. We will notify you once verified.'
                : 'আপনার পেশাগত প্রোফাইলটি প্রশাসক দ্বারা পর্যালোচনা করা হচ্ছে। যাচাই করা হলে আমরা আপনাকে জানাব।'}
            </div>
          </div>
        </div>
      )}

      {status === 'rejected' && (
        <div className="alert-banner alert-rejected">
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700 }}>{language === 'en' ? 'Verification Rejected' : 'যাচাইকরণ প্রত্যাখ্যাত'}</div>
            <div style={{ fontSize: '0.875rem', marginTop: '0.15rem' }}>
              {language === 'en'
                ? 'Your request was rejected. Please review your enrollment certificates in the Vault and resubmit.'
                : 'আপনার অনুরোধটি প্রত্যাখ্যান করা হয়েছে। অনুগ্রহ করে ভল্টে আপনার প্রশংসাপত্র পরীক্ষা করুন এবং আবার জমা দিন।'}
            </div>
          </div>
        </div>
      )}

      {status === 'verified' && (
        <div className="alert-banner alert-verified">
          <span style={{ fontSize: '1.25rem' }}>✓</span>
          <div>
            <div style={{ fontWeight: 700 }}>{language === 'en' ? 'Profile Verified' : 'প্রোফাইল যাচাইকৃত'}</div>
            <div style={{ fontSize: '0.875rem', marginTop: '0.15rem' }}>
              {language === 'en'
                ? 'Your profile is fully verified. You can now accept incoming consultations and interact with citizens.'
                : 'আপনার প্রোফাইলটি সম্পূর্ণরূপে যাচাইকৃত। আপনি এখন পরামর্শের অনুরোধ গ্রহণ করতে এবং মক্কেলদের সাথে আলোচনা করতে পারেন।'}
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="dashboard-grid">
        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: 'var(--color-gray-400)', fontSize: '0.825rem', fontWeight: 600, textTransform: 'uppercase' }}>
              {language === 'en' ? 'Pending Requests' : 'পেন্ডিং অনুরোধ'}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-navy)', marginTop: '0.5rem' }}>
              {Number(stats?.pending_count || 0)}
            </div>
          </div>
          <Link href="/advocate/consultations?tab=pending" style={{ fontSize: '0.8rem', color: '#C9A84C', fontWeight: 700, textDecoration: 'none', marginTop: '1rem', display: 'block' }}>
            {language === 'en' ? 'View incoming' : 'অনুরোধ দেখুন'} →
          </Link>
        </div>

        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: 'var(--color-gray-400)', fontSize: '0.825rem', fontWeight: 600, textTransform: 'uppercase' }}>
              {language === 'en' ? 'Active Matters' : 'সক্রিয় কেস'}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-navy)', marginTop: '0.5rem' }}>
              {Number(stats?.accepted_count || 0)}
            </div>
          </div>
          <Link href="/advocate/consultations?tab=active" style={{ fontSize: '0.8rem', color: '#C9A84C', fontWeight: 700, textDecoration: 'none', marginTop: '1rem', display: 'block' }}>
            {language === 'en' ? 'View active' : 'সক্রিয় কেস দেখুন'} →
          </Link>
        </div>

        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: 'var(--color-gray-400)', fontSize: '0.825rem', fontWeight: 600, textTransform: 'uppercase' }}>
              {language === 'en' ? 'Declined Requests' : 'প্রত্যাখ্যাত অনুরোধ'}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-navy)', marginTop: '0.5rem' }}>
              {Number(stats?.declined_count || 0)}
            </div>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-400)', marginTop: '1rem', display: 'block' }}>
            Total processed
          </span>
        </div>

        {/* Profile Completeness Card */}
        <div className="stat-card" style={{ gridColumn: 'span 1', background: '#FAF9F6', border: '1.5px dashed rgba(201,168,76,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-navy)', textTransform: 'uppercase' }}>
              {language === 'en' ? 'Profile Setup' : 'প্রোফাইল সেটআপ'}
            </span>
            <span style={{ fontWeight: 800, color: '#C9A84C', fontSize: '1.1rem' }}>{completeness}%</span>
          </div>
          <div style={{ height: '6px', background: '#E5E7EB', borderRadius: '3px', margin: '0.75rem 0', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#C9A84C', width: `${completeness}%` }} />
          </div>
          <Link href="/advocate/onboarding" style={{ fontSize: '0.8rem', color: '#0D1B2A', fontWeight: 700, textDecoration: 'underline' }}>
            {language === 'en' ? 'Edit details' : 'তথ্য পরিবর্তন'}
          </Link>
        </div>
      </div>

      {/* Recent Consultation Requests */}
      <div className="section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-navy)', margin: 0 }}>
            {language === 'en' ? 'Recent Consultation Requests' : 'সাম্প্রতিক পরামর্শের অনুরোধ'}
          </h3>
          <Link href="/advocate/consultations" style={{ fontSize: '0.875rem', color: '#C9A84C', fontWeight: 600, textDecoration: 'none' }}>
            {language === 'en' ? 'All Requests' : 'সব অনুরোধ'} →
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {recentConsultations.map(cons => (
            <div key={cons.id} className="list-row">
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className={`badge ${cons.status === 'requested' ? 'badge-navy' : cons.status === 'accepted' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                    {cons.status}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>
                    {new Date(cons.requested_at).toLocaleDateString(language === 'bn' ? 'bn-IN' : 'en-IN')}
                  </span>
                </div>
                <div style={{
                  fontSize: '0.925rem',
                  fontWeight: 600,
                  color: 'var(--color-navy)',
                  marginTop: '0.35rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  maxWidth: '550px',
                }}>
                  {cons.query_text}
                </div>
              </div>

              <Link href={`/advocate/consultations/${cons.id}`} className="btn btn-ghost btn-sm" style={{ color: '#C9A84C', fontWeight: 700 }}>
                {language === 'en' ? 'Review' : 'পর্যালোচনা'} →
              </Link>
            </div>
          ))}

          {recentConsultations.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-gray-400)', fontStyle: 'italic' }}>
              {language === 'en' ? 'No recent consultation requests.' : 'কোনো সাম্প্রতিক পরামর্শের অনুরোধ নেই।'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
