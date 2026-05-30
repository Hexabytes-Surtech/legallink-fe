'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { OTPModal } from '@/components/features/OTPModal';
import { SlotPickerModal } from '@/components/booking/SlotPickerModal';
import { apiClient } from '@/lib/api/client';
import { USE_MOCK, mockDelay, MOCK_ADVOCATES } from '@/data/mock';
import type { Advocate } from '@/types';

const PRACTICE_LABELS: Record<string, string> = {
  tenancy: 'Tenancy',
  civil: 'Civil',
  property: 'Property',
  criminal: 'Criminal',
  consumer: 'Consumer',
  family: 'Family',
  motor_vehicle: 'Motor Vehicle',
  labour: 'Labour',
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  bn: 'বাংলা',
  hi: 'Hindi',
};

const DISTRICT_LABELS: Record<string, string> = {
  kolkata: 'Kolkata',
  howrah: 'Howrah',
  hooghly: 'Hooghly',
  'north-24-parganas': 'North 24 Parganas',
  'south-24-parganas': 'South 24 Parganas',
  nadia: 'Nadia',
  murshidabad: 'Murshidabad',
  burdwan: 'Burdwan',
  darjeeling: 'Darjeeling',
  malda: 'Malda',
};

export default function AdvocateProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const [advocate, setAdvocate] = useState<Advocate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [showSlotPicker, setShowSlotPicker] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (USE_MOCK) {
          await mockDelay(400);
          const found = MOCK_ADVOCATES.find(a => a.id === id);
          if (!found) { setNotFound(true); return; }
          setAdvocate(found);
        } else {
          const res = await apiClient<Advocate>(`/advocates/${id}`);
          if (res.success && res.data) {
            setAdvocate(res.data);
          } else if (res.error?.includes('404') || res.error?.includes('not found')) {
            setNotFound(true);
          } else {
            throw new Error(res.error ?? 'Failed to load advocate');
          }
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  function handleRequestConsultation() {
    if (!isAuthenticated) {
      setShowOTP(true);
    } else {
      router.push('/intake');
    }
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div className="skeleton" style={{ height: '220px', borderRadius: '1.25rem', marginBottom: '1.5rem' }} />
        <div className="skeleton" style={{ height: '120px', borderRadius: '1.25rem', marginBottom: '1.5rem' }} />
        <div className="skeleton" style={{ height: '160px', borderRadius: '1.25rem' }} />
      </div>
    );
  }

  // ── 404 ──────────────────────────────────────────────────────────────────
  if (notFound || !advocate) {
    return (
      <div style={{ maxWidth: '520px', margin: '6rem auto', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⚖️</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.5rem' }}>
          {language === 'en' ? 'Advocate not found' : 'আইনজীবী পাওয়া যায়নি'}
        </h2>
        <p style={{ color: '#6B7280', marginBottom: '1.5rem' }}>
          {language === 'en'
            ? 'This advocate profile does not exist or has been removed.'
            : 'এই আইনজীবীর প্রোফাইল নেই বা মুছে ফেলা হয়েছে।'}
        </p>
        <Link href="/advocates" className="btn btn-primary">
          {language === 'en' ? '← Back to directory' : '← তালিকায় ফিরুন'}
        </Link>
      </div>
    );
  }

  const name = advocate.name;
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('');
  const avatarUrl = advocate.avatar_url;
  const verificationStatus = advocate.verificationStatus ?? advocate.verification_status;
  const practiceAreas = advocate.practiceAreas ?? advocate.practice_areas ?? [];
  const stateBar = advocate.stateBar ?? advocate.state_bar;
  const barNo = advocate.barEnrolmentNumber ?? advocate.bar_enrolment_number;
  const courts = advocate.courts ?? [];
  const languages = advocate.languages ?? [];
  const districts = advocate.districts ?? [];
  const bio = advocate.bio;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream, #F8F6F2)', paddingBottom: '7rem' }}>
      <style>{`
        .prof-hero {
          background: linear-gradient(135deg, #0D1B2A 0%, #1E3249 100%);
          padding: 2.5rem 1.5rem 2rem;
        }
        .prof-hero-inner {
          max-width: 860px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 1.75rem;
          flex-wrap: wrap;
        }
        .prof-avatar {
          width: 5rem;
          height: 5rem;
          border-radius: 50%;
          background: linear-gradient(135deg, #C9A84C, #E2C475);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          color: #0D1B2A;
          border: 3px solid rgba(201,168,76,0.5);
          flex-shrink: 0;
          overflow: hidden;
        }
        .prof-name-block { flex: 1; }
        .prof-name {
          font-size: clamp(1.3rem, 3vw, 1.75rem);
          font-weight: 800;
          color: white;
          line-height: 1.2;
          margin-bottom: 0.4rem;
        }
        .prof-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
        .prof-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .prof-badge-verified {
          background: rgba(16,185,129,0.15);
          border: 1px solid rgba(16,185,129,0.3);
          color: #10B981;
        }
        .prof-badge-pending {
          background: rgba(245,158,11,0.15);
          border: 1px solid rgba(245,158,11,0.3);
          color: #F59E0B;
        }
        .prof-chip {
          padding: 4px 12px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 9999px;
          font-size: 0.78rem;
          color: rgba(255,255,255,0.75);
          font-weight: 500;
        }
        .prof-section-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 1.25rem;
          padding: 1.75rem;
          margin-bottom: 1.25rem;
        }
        .prof-section-title {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #9CA3AF;
          margin-bottom: 1rem;
        }
        .prof-tag {
          display: inline-block;
          padding: 5px 14px;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 500;
        }
        .prof-tag-area {
          background: rgba(13,27,42,0.06);
          color: #374151;
          border: 1px solid #E5E7EB;
        }
        .prof-tag-lang {
          background: rgba(201,168,76,0.1);
          color: #A0803A;
          border: 1px solid rgba(201,168,76,0.2);
        }
        .prof-tag-district {
          background: rgba(99,102,241,0.07);
          color: #4F46E5;
          border: 1px solid rgba(99,102,241,0.15);
        }
        .prof-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .court-row {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.625rem 0;
          border-bottom: 1px solid #F3F4F6;
          font-size: 0.9rem;
          color: #374151;
          font-weight: 500;
        }
        .court-row:last-child { border-bottom: none; }
        .prof-bio {
          font-size: 0.9375rem;
          line-height: 1.7;
          color: #374151;
        }
        .sticky-cta {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #E5E7EB;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          z-index: 40;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.06);
        }
        .back-link {
          font-size: 0.875rem;
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          margin-bottom: 1.25rem;
          transition: color 0.15s;
        }
        .back-link:hover { color: #C9A84C; }
      `}</style>

      {showOTP && (
        <OTPModal
          onClose={() => setShowOTP(false)}
          onSuccess={() => router.push('/intake')}
          redirectTo="/intake"
        />
      )}
      {showSlotPicker && advocate && (
        <SlotPickerModal
          advocateId={advocate.id ?? advocate.advocate_id ?? ''}
          advocateName={advocate.name}
          avatarUrl={advocate.avatar_url}
          onClose={() => setShowSlotPicker(false)}
        />
      )}

      {/* Hero */}
      <div className="prof-hero">
        <div className="prof-hero-inner">
          <Link href="/advocates" className="back-link" style={{ width: '100%' }}>
            ← {language === 'en' ? 'Back to directory' : 'তালিকায় ফিরুন'}
          </Link>

          <div
            className="prof-avatar"
            style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          >
            {!avatarUrl && initials}
          </div>

          <div className="prof-name-block">
            <div className="prof-name" style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {name}
            </div>
            <div className="prof-meta">
              {verificationStatus === 'verified' ? (
                <span className="prof-badge prof-badge-verified">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  {language === 'en' ? 'Verified' : 'যাচাইকৃত'}
                </span>
              ) : (
                <span className="prof-badge prof-badge-pending">
                  {language === 'en' ? 'Pending Verification' : 'যাচাই বাকি'}
                </span>
              )}
              {stateBar && <span className="prof-chip">{stateBar} Bar</span>}
              {barNo && <span className="prof-chip" style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{barNo}</span>}
              {advocate.rating != null ? (
                <span className="prof-chip" style={{ background: 'rgba(201,168,76,0.2)', borderColor: 'rgba(201,168,76,0.35)', color: '#E2C475', fontWeight: 700 }}>
                  ★ {Number(advocate.rating).toFixed(1)}
                  {advocate.rating_count != null && advocate.rating_count > 0 && (
                    <span style={{ fontWeight: 400, marginLeft: 4 }}>({advocate.rating_count})</span>
                  )}
                </span>
              ) : (
                <span className="prof-chip" style={{ fontStyle: 'italic', opacity: 0.6 }}>
                  ★ {language === 'en' ? 'No ratings yet' : 'এখনো কোনো রেটিং নেই'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '860px', margin: '2rem auto', padding: '0 1.5rem' }}>

        {/* Bio */}
        {bio && (
          <div className="prof-section-card">
            <div className="prof-section-title">{language === 'en' ? 'About' : 'পরিচিতি'}</div>
            <p className="prof-bio" style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {bio}
            </p>
          </div>
        )}

        {/* Practice areas */}
        {practiceAreas.length > 0 && (
          <div className="prof-section-card">
            <div className="prof-section-title">{language === 'en' ? 'Practice Areas' : 'অনুশীলন ক্ষেত্র'}</div>
            <div className="prof-tags">
              {practiceAreas.map(area => (
                <span key={area} className="prof-tag prof-tag-area">
                  {PRACTICE_LABELS[area] ?? area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Languages + Districts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          {languages.length > 0 && (
            <div className="prof-section-card" style={{ margin: 0 }}>
              <div className="prof-section-title">{language === 'en' ? 'Languages' : 'ভাষা'}</div>
              <div className="prof-tags">
                {languages.map(lang => (
                  <span key={lang} className="prof-tag prof-tag-lang">
                    {LANGUAGE_NAMES[lang] ?? lang}
                  </span>
                ))}
              </div>
            </div>
          )}

          {districts.length > 0 && (
            <div className="prof-section-card" style={{ margin: 0 }}>
              <div className="prof-section-title">{language === 'en' ? 'Districts' : 'জেলা'}</div>
              <div className="prof-tags">
                {districts.map(d => (
                  <span key={d} className="prof-tag prof-tag-district">
                    {DISTRICT_LABELS[d] ?? d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Courts */}
        {courts.length > 0 && (
          <div className="prof-section-card">
            <div className="prof-section-title">{language === 'en' ? 'Courts' : 'আদালত'}</div>
            {courts.map(court => (
              <div key={court} className="court-row">
                <span style={{ color: '#C9A84C' }}>⚖️</span>
                {court}
              </div>
            ))}
          </div>
        )}

        {/* Rule 36 disclaimer */}
        <p style={{ fontSize: '0.775rem', color: '#9CA3AF', textAlign: 'center', lineHeight: 1.6, fontStyle: 'italic', padding: '0 1rem' }}>
          {language === 'en'
            ? 'In compliance with Bar Council of India Rules (Rule 36), fees, success rates, and case outcomes are not displayed.'
            : 'বার কাউন্সিল অব ইন্ডিয়ার নিয়ম ৩৬ অনুযায়ী, ফি, সাফল্যের হার এবং মামলার ফলাফল প্রদর্শন করা হয় না।'}
        </p>
      </div>

      {/* Sticky CTA */}
      <div className="sticky-cta">
        {isAuthenticated && (
          <button
            className="btn btn-secondary"
            style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}
            onClick={() => setShowSlotPicker(true)}
          >
            📅 {language === 'en' ? 'Book a Time' : 'সময় বুক করুন'}
          </button>
        )}
        <button
          className="btn btn-primary"
          style={{ minWidth: '200px', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}
          onClick={handleRequestConsultation}
        >
          {language === 'en' ? 'Request Consultation' : 'পরামর্শ অনুরোধ করুন'}
        </button>
      </div>
    </div>
  );
}
