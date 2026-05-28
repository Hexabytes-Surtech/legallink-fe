'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';
import type { Advocate, OnboardingPayload } from '@/types';

// ---------------------------------------------------------------------------
// BCI 2008 compliant onboarding wizard — 4 steps.
// Master plan §5.3. Fields here are limited to what the BCI 2008 amendment
// permits an advocate to advertise; do not add fee, success rate, etc.
// ---------------------------------------------------------------------------

interface DocumentInfo {
  id: string;
  file_path: string;
  file_type: string;
  uploaded_at: string;
  label?: string;
}

// 22 State Bar Councils (the BCI's recognised list).
const STATE_BARS = [
  'Andhra Pradesh',
  'Assam, Nagaland, Mizoram, Manipur, Tripura, Arunachal Pradesh, Sikkim',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir and Ladakh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra & Goa',
  'Odisha',
  'Punjab and Haryana',
  'Rajasthan',
  'Tamil Nadu & Puducherry',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const PRACTICE_AREAS = [
  { value: 'criminal', labelEn: 'Criminal', labelBn: 'ফৌজদারি' },
  { value: 'civil', labelEn: 'Civil', labelBn: 'দেওয়ানি' },
  { value: 'family', labelEn: 'Family', labelBn: 'পারিবারিক' },
  { value: 'labour', labelEn: 'Labour', labelBn: 'শ্রম' },
  { value: 'tenancy', labelEn: 'Tenancy', labelBn: 'ভাড়াটে' },
  { value: 'traffic', labelEn: 'Traffic', labelBn: 'যানবাহন' },
  { value: 'corporate', labelEn: 'Corporate', labelBn: 'কর্পোরেট' },
  { value: 'consumer', labelEn: 'Consumer', labelBn: 'ভোক্তা' },
  { value: 'constitutional', labelEn: 'Constitutional', labelBn: 'সাংবিধানিক' },
];

const LANGUAGES = [
  { value: 'bn', labelEn: 'Bengali', labelBn: 'বাংলা' },
  { value: 'en', labelEn: 'English', labelBn: 'ইংরেজি' },
  { value: 'hi', labelEn: 'Hindi', labelBn: 'হিন্দি' },
];

// Phase 1: West Bengal districts only (per master plan §5.3).
const WB_DISTRICTS = [
  'Kolkata',
  'Howrah',
  'Hooghly',
  'North 24 Parganas',
  'South 24 Parganas',
  'Nadia',
  'Murshidabad',
  'Birbhum',
  'Purba Bardhaman',
  'Paschim Bardhaman',
  'Bankura',
  'Purulia',
  'Jhargram',
  'Paschim Medinipur',
  'Purba Medinipur',
  'Malda',
  'Uttar Dinajpur',
  'Dakshin Dinajpur',
  'Jalpaiguri',
  'Alipurduar',
  'Darjeeling',
  'Kalimpong',
  'Cooch Behar',
];

// Phrases the BCI explicitly disallows in advocate-facing copy (Rule 36).
const BCI_BANNED_PHRASES = [
  'best lawyer',
  'top rated',
  'guaranteed',
  'guarantee',
  'fee',
  'fees',
  '₹',
  'rs.',
  'win',
  'won',
  'success rate',
];

const BIO_MAX = 300;
const CURRENT_YEAR = new Date().getFullYear();

const STEP_LABELS = [
  { en: 'Identity', bn: 'পরিচয়' },
  { en: 'Bar Council', bn: 'বার কাউন্সিল' },
  { en: 'Practice', bn: 'অনুশীলন' },
  { en: 'Documents', bn: 'নথিপত্র' },
];

function bioWarnings(bio: string): string[] {
  if (!bio) return [];
  const lower = bio.toLowerCase();
  return BCI_BANNED_PHRASES.filter(p => lower.includes(p));
}

function phoneIsValid(phone: string): boolean {
  // Accepts 10-digit Indian numbers, optionally prefixed with +91 / 0
  return /^(\+91|0)?[6-9]\d{9}$/.test(phone.replace(/\s|-/g, ''));
}

export default function AdvocateOnboardingPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const isBn = language === 'bn';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 1
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Step 2
  const [barNumber, setBarNumber] = useState('');
  const [stateBar, setStateBar] = useState('West Bengal');
  const [yearOfEnrolment, setYearOfEnrolment] = useState<string>('');
  const [courts, setCourts] = useState<string[]>([]);
  const [newCourt, setNewCourt] = useState('');

  // Step 3
  const [practiceAreas, setPracticeAreas] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(['en']);
  const [districts, setDistricts] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [availability, setAvailability] = useState<'online' | 'in_person' | 'both'>('both');

  // Step 4
  const [uploadedDocs, setUploadedDocs] = useState<DocumentInfo[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const populate = useCallback(
    (data: Advocate) => {
      setName(data.name ?? '');
      setPhone(data.phone ?? '');
      setAddress(data.address ?? '');
      setBarNumber(data.bar_enrolment_number ?? data.barEnrolmentNumber ?? '');
      setStateBar(data.state_bar ?? data.stateBar ?? 'West Bengal');
      const year = data.year_of_enrolment ?? data.yearOfEnrolment;
      if (year) setYearOfEnrolment(String(year));
      setPracticeAreas(data.practice_areas ?? data.practiceAreas ?? []);
      setCourts(data.courts ?? []);
      setLanguages(data.languages?.length ? data.languages : ['en']);
      setDistricts(data.districts ?? []);
      setBio(data.bio ?? '');
      const mode = data.availability_mode ?? data.availabilityMode;
      if (mode === 'online' || mode === 'in_person' || mode === 'both') setAvailability(mode);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [me, docs] = await Promise.all([
          apiClient<Advocate>('/advocate/me'),
          apiClient<DocumentInfo[]>('/advocate/documents'),
        ]);
        if (cancelled) return;
        if (me.success && me.data) populate(me.data);
        if (docs.success && docs.data) setUploadedDocs(docs.data);
      } catch {
        if (!cancelled) {
          setError(isBn ? 'বিদ্যমান প্রোফাইল লোড করা যায়নি।' : 'Failed to load existing profile.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (user) load();
    return () => {
      cancelled = true;
    };
  }, [user, populate, isBn]);

  function validateStep(target: number): string | null {
    if (target >= 1) {
      if (!name.trim()) return isBn ? 'পূর্ণ নাম দিন।' : 'Full name is required.';
      if (!phoneIsValid(phone)) return isBn ? 'বৈধ মোবাইল নম্বর দিন।' : 'Enter a valid 10-digit Indian mobile number.';
    }
    if (target >= 2) {
      if (!barNumber.trim()) return isBn ? 'বার কাউন্সিল নথিভুক্তি নম্বর দিন।' : 'Bar enrolment number is required.';
      if (!stateBar) return isBn ? 'রাজ্য বার কাউন্সিল বেছে নিন।' : 'Select a State Bar Council.';
      const year = Number(yearOfEnrolment);
      if (!year || year < 1950 || year > CURRENT_YEAR) {
        return isBn
          ? `নথিভুক্তির বছর ১৯৫০ থেকে ${CURRENT_YEAR}-এর মধ্যে হতে হবে।`
          : `Year of enrolment must be between 1950 and ${CURRENT_YEAR}.`;
      }
      if (courts.length === 0) return isBn ? 'অন্তত একটি আদালত যুক্ত করুন।' : 'Add at least one court of practice.';
    }
    if (target >= 3) {
      if (practiceAreas.length === 0) return isBn ? 'অন্তত একটি অনুশীলনের ক্ষেত্র বেছে নিন।' : 'Select at least one practice area.';
      if (languages.length === 0) return isBn ? 'অন্তত একটি ভাষা বেছে নিন।' : 'Select at least one language.';
      if (districts.length === 0) return isBn ? 'অন্তত একটি জেলা বেছে নিন।' : 'Select at least one district.';
      if (bio.length > BIO_MAX) return isBn ? `সংক্ষিপ্ত পরিচয় সর্বোচ্চ ${BIO_MAX} অক্ষর।` : `Bio must be ${BIO_MAX} characters or fewer.`;
      const banned = bioWarnings(bio);
      if (banned.length > 0) {
        return isBn
          ? `BCI Rule 36 অনুযায়ী এই শব্দগুলি ব্যবহার করা যাবে না: ${banned.join(', ')}`
          : `BCI Rule 36 prohibits these terms in your bio: ${banned.join(', ')}`;
      }
    }
    return null;
  }

  async function saveAndAdvance(targetStep: number) {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setSaving(true);
    try {
      const payload: Partial<OnboardingPayload> = {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        bar_enrolment_number: barNumber.trim(),
        state_bar: stateBar,
        year_of_enrolment: Number(yearOfEnrolment) || undefined,
        courts,
        practice_areas: practiceAreas,
        languages,
        districts,
        bio: bio.trim(),
        availability_mode: availability,
      };
      const res = await apiClient('/advocate/profile', { method: 'PUT', body: payload });
      if (!res.success) {
        throw new Error(res.error ?? 'Failed to save progress.');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('advocate-profile-updated'));
      }
      setStep(targetStep);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save progress.');
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, label: string) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError(isBn ? 'ফাইল সর্বোচ্চ ৫MB হতে হবে।' : 'File must be 5 MB or smaller.');
      return;
    }
    setError('');
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append('document', file);
      fd.append('label', label);
      const res = await apiClient<DocumentInfo>('/advocate/documents', { method: 'POST', formData: fd });
      if (res.success && res.data) {
        setUploadedDocs(prev => [...prev, { ...res.data!, label }]);
      } else {
        throw new Error(res.error ?? 'Upload failed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploadingDoc(false);
    }
  }

  async function handleSubmitForVerification() {
    const err = validateStep(3);
    if (err) {
      setError(err);
      return;
    }
    if (uploadedDocs.length === 0) {
      setError(
        isBn
          ? 'যাচাইকরণের জন্য আপনার Certificate of Practice আপলোড করুন।'
          : 'Upload your Certificate of Practice before submitting for verification.'
      );
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await apiClient('/advocate/submit-verification', { method: 'POST' });
      if (!res.success) throw new Error(res.error ?? 'Submission failed.');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('advocate-profile-updated'));
      }
      setSuccess(
        isBn
          ? 'আপনার প্রোফাইল যাচাইকরণের জন্য জমা দেওয়া হয়েছে। সাধারণত ২৪–৪৮ ঘণ্টার মধ্যে পর্যালোচনা সম্পন্ন হয়।'
          : 'Your profile is submitted. Reviews typically complete within 24–48 hours.'
      );
      setTimeout(() => router.push('/advocate/dashboard'), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleIn(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  }

  function addCourt() {
    const trimmed = newCourt.trim();
    if (trimmed && !courts.includes(trimmed)) {
      setCourts(prev => [...prev, trimmed]);
      setNewCourt('');
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '3rem', width: '40%', marginBottom: '2rem' }} />
        <div className="skeleton" style={{ height: '500px', borderRadius: '1.25rem' }} />
      </div>
    );
  }

  const bannedHits = bioWarnings(bio);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', paddingBottom: '4rem' }}>
      <style>{`
        .wiz-header { margin-bottom: 1.75rem; }
        .wiz-title { font-size: 1.75rem; font-weight: 800; color: #0D1B2A; letter-spacing: -0.01em; }
        .wiz-sub { color: #6B7280; font-size: 1.0625rem; margin-top: 0.25rem; }
        .wiz-card {
          background: white;
          border-radius: 1.25rem;
          padding: 2.25rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.04);
          border: 1px solid rgba(201,168,76,0.15);
        }
        .wiz-rail {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 2.5rem;
        }
        .wiz-rail-item {
          padding: 14px 16px;
          border-radius: 14px;
          border: 1.5px solid #E5E7EB;
          background: white;
          transition: all 0.2s;
        }
        .wiz-rail-item.active {
          border-color: #C9A84C;
          background: rgba(201,168,76,0.08);
          box-shadow: 0 6px 14px rgba(201,168,76,0.12);
        }
        .wiz-rail-item.done {
          border-color: rgba(13,27,42,0.18);
          background: #F9FAFB;
        }
        .wiz-rail-step { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #9CA3AF; }
        .wiz-rail-item.active .wiz-rail-step { color: #A0803A; }
        .wiz-rail-item.done .wiz-rail-step { color: #059669; }
        .wiz-rail-label { font-weight: 700; color: #0D1B2A; margin-top: 4px; }
        .wiz-section-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #0D1B2A;
          padding-bottom: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid #E5E7EB;
        }
        .wiz-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.25rem; }
        @media (max-width: 640px) { .wiz-grid { grid-template-columns: 1fr; } .wiz-rail { grid-template-columns: 1fr 1fr; } }
        .wiz-field-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.4rem;
        }
        .wiz-field-hint { font-size: 0.75rem; color: #6B7280; margin-top: 0.3rem; }
        .wiz-chip-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 8px;
        }
        .wiz-chip {
          padding: 8px 12px;
          border: 1.5px solid #E5E7EB;
          border-radius: 999px;
          background: white;
          color: #374151;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          text-align: center;
          transition: all 0.18s ease;
          user-select: none;
        }
        .wiz-chip:hover { border-color: rgba(201,168,76,0.5); }
        .wiz-chip.selected {
          border-color: #C9A84C;
          background: rgba(201,168,76,0.12);
          color: #0D1B2A;
        }
        .court-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(13,27,42,0.06);
          border: 1px solid rgba(13,27,42,0.10);
          font-size: 0.85rem;
          font-weight: 600;
          color: #0D1B2A;
        }
        .court-tag button {
          background: none;
          border: none;
          cursor: pointer;
          color: #DC2626;
          font-weight: 800;
          padding: 0;
        }
        .doc-drop {
          border: 2px dashed rgba(201,168,76,0.4);
          background: rgba(201,168,76,0.04);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          position: relative;
        }
        .doc-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
        }
        .wiz-nav {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #E5E7EB;
        }
      `}</style>

      <header className="wiz-header">
        <h1 className="wiz-title" style={{ fontFamily: isBn ? 'var(--font-bangla)' : undefined }}>
          {isBn ? 'অ্যাডভোকেট অনবোর্ডিং' : 'Advocate Onboarding'}
        </h1>
        <p className="wiz-sub" style={{ fontFamily: isBn ? 'var(--font-bangla)' : undefined }}>
          {isBn
            ? 'BCI ২০০৮ সংশোধনী অনুসারে অনুমোদিত তথ্য জমা দিন। ৪ ধাপে আপনার পেশাগত প্রোফাইল সম্পূর্ণ করুন।'
            : 'Provide only the details permitted by the BCI 2008 amendment. Four short steps to a verifiable profile.'}
        </p>
      </header>

      {error && (
        <div
          role="alert"
          style={{
            padding: '0.875rem 1rem',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#DC2626',
            borderRadius: '0.75rem',
            marginBottom: '1.25rem',
            fontWeight: 500,
          }}
        >
          ⚠ {error}
        </div>
      )}

      {success && (
        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.25)',
            color: '#065F46',
            borderRadius: '0.75rem',
            marginBottom: '1.25rem',
            fontWeight: 600,
          }}
        >
          ✓ {success}
        </div>
      )}

      <div className="wiz-card">
        <ol className="wiz-rail">
          {STEP_LABELS.map((label, i) => {
            const stepIdx = i + 1;
            const cls = step === stepIdx ? 'active' : step > stepIdx ? 'done' : '';
            return (
              <li key={label.en} className={`wiz-rail-item ${cls}`}>
                <div className="wiz-rail-step">
                  {isBn ? `ধাপ ${stepIdx}` : `Step ${stepIdx}`}
                </div>
                <div className="wiz-rail-label">{isBn ? label.bn : label.en}</div>
              </li>
            );
          })}
        </ol>

        {/* STEP 1 — Identity */}
        {step === 1 && (
          <section>
            <h2 className="wiz-section-title">
              {isBn ? '১. ব্যক্তিগত পরিচয়' : '1. Basic Identity'}
            </h2>
            <div className="wiz-grid">
              <div>
                <label className="wiz-field-label">
                  {isBn ? 'বার কাউন্সিল সার্টিফিকেট অনুযায়ী পূর্ণ নাম' : 'Full legal name (as on Bar Council certificate)'} *
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder="Adv. Sunita Banerjee"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="wiz-field-label">{isBn ? 'ইমেল (লক করা)' : 'Email (read-only)'}</label>
                <input className="input" type="email" value={user?.email ?? ''} disabled readOnly />
              </div>
            </div>
            <div className="wiz-grid">
              <div>
                <label className="wiz-field-label">
                  {isBn ? 'মোবাইল নম্বর' : 'Mobile number'} *
                </label>
                <input
                  className="input"
                  type="tel"
                  inputMode="numeric"
                  placeholder="+91 98xxxxxxxx"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="wiz-field-label">{isBn ? 'চেম্বার ঠিকানা (ঐচ্ছিক)' : 'Chamber address (optional)'}</label>
                <input
                  className="input"
                  type="text"
                  placeholder={isBn ? 'যেমন: রুম ৪, কোর্ট ভবন, কলকাতা' : 'e.g. Room 4, Court Building, Kolkata'}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
            </div>
          </section>
        )}

        {/* STEP 2 — BCI Details */}
        {step === 2 && (
          <section>
            <h2 className="wiz-section-title">
              {isBn ? '২. বার কাউন্সিল বিবরণ (BCI ২০০৮)' : '2. Bar Council Details (BCI 2008)'}
            </h2>
            <div className="wiz-grid">
              <div>
                <label className="wiz-field-label">
                  {isBn ? 'বার নথিভুক্তি নম্বর' : 'Bar enrolment number'} *
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. WB/1234/2020"
                  value={barNumber}
                  onChange={e => setBarNumber(e.target.value)}
                />
                <span className="wiz-field-hint">
                  {isBn
                    ? 'আপনার Certificate of Practice-এ যেভাবে আছে ঠিক সেভাবে।'
                    : 'Must match exactly the number on your Certificate of Practice.'}
                </span>
              </div>
              <div>
                <label className="wiz-field-label">{isBn ? 'রাজ্য বার কাউন্সিল' : 'State Bar Council'} *</label>
                <select className="input" value={stateBar} onChange={e => setStateBar(e.target.value)}>
                  {STATE_BARS.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="wiz-grid">
              <div>
                <label className="wiz-field-label">{isBn ? 'নথিভুক্তির বছর' : 'Year of enrolment'} *</label>
                <input
                  className="input"
                  type="number"
                  min={1950}
                  max={CURRENT_YEAR}
                  placeholder="2015"
                  value={yearOfEnrolment}
                  onChange={e => setYearOfEnrolment(e.target.value)}
                />
              </div>
              <div />
            </div>
            <div>
              <label className="wiz-field-label">{isBn ? 'অনুশীলনের আদালত' : 'Courts of practice'} *</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  className="input"
                  type="text"
                  placeholder={isBn ? 'যেমন: কলকাতা হাইকোর্ট' : 'e.g. Calcutta High Court'}
                  value={newCourt}
                  onChange={e => setNewCourt(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCourt();
                    }
                  }}
                />
                <button type="button" className="btn btn-secondary" onClick={addCourt}>
                  {isBn ? 'যুক্ত করুন' : 'Add'}
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                {courts.length === 0 && (
                  <span style={{ fontSize: '0.8125rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                    {isBn ? 'এখনও কোনো আদালত যুক্ত হয়নি।' : 'No courts added yet.'}
                  </span>
                )}
                {courts.map((c, i) => (
                  <span key={`${c}-${i}`} className="court-tag">
                    {c}
                    <button
                      type="button"
                      aria-label="Remove"
                      onClick={() => setCourts(prev => prev.filter((_, idx) => idx !== i))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* STEP 3 — Practice Profile */}
        {step === 3 && (
          <section>
            <h2 className="wiz-section-title">
              {isBn ? '৩. অনুশীলন প্রোফাইল' : '3. Practice Profile'}
            </h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="wiz-field-label">{isBn ? 'অনুশীলনের ক্ষেত্র' : 'Practice areas'} *</label>
              <div className="wiz-chip-grid">
                {PRACTICE_AREAS.map(p => {
                  const selected = practiceAreas.includes(p.value);
                  return (
                    <button
                      key={p.value}
                      type="button"
                      className={`wiz-chip ${selected ? 'selected' : ''}`}
                      onClick={() => toggleIn(practiceAreas, p.value, setPracticeAreas)}
                    >
                      {isBn ? p.labelBn : p.labelEn}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="wiz-field-label">{isBn ? 'কথ্য ভাষা' : 'Languages'} *</label>
              <div className="wiz-chip-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {LANGUAGES.map(l => {
                  const selected = languages.includes(l.value);
                  return (
                    <button
                      key={l.value}
                      type="button"
                      className={`wiz-chip ${selected ? 'selected' : ''}`}
                      onClick={() => toggleIn(languages, l.value, setLanguages)}
                    >
                      {isBn ? l.labelBn : l.labelEn}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="wiz-field-label">
                {isBn ? 'যে জেলাগুলিতে উপলব্ধ (পশ্চিমবঙ্গ)' : 'Districts where you are available (West Bengal)'} *
              </label>
              <div className="wiz-chip-grid">
                {WB_DISTRICTS.map(d => {
                  const selected = districts.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      className={`wiz-chip ${selected ? 'selected' : ''}`}
                      onClick={() => toggleIn(districts, d, setDistricts)}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="wiz-field-label">
                {isBn ? 'সংক্ষিপ্ত পরিচয় (সর্বোচ্চ ৩০০ অক্ষর)' : 'Brief bio (max 300 chars)'}
              </label>
              <textarea
                className="input textarea"
                rows={4}
                maxLength={BIO_MAX}
                placeholder={
                  isBn
                    ? 'BCI বিধি অনুসারে: ফি, সাফল্যের হার, বা “সেরা” জাতীয় শব্দ ব্যবহার করবেন না।'
                    : 'BCI compliant: do not mention fees, success rate, or phrases like “best” / “top rated”.'
                }
                value={bio}
                onChange={e => setBio(e.target.value)}
                style={{ minHeight: '6rem', fontFamily: isBn ? 'var(--font-bangla)' : 'inherit' }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '0.35rem',
                  fontSize: '0.75rem',
                  color: bannedHits.length > 0 ? '#DC2626' : '#9CA3AF',
                }}
              >
                <span>
                  {bannedHits.length > 0
                    ? (isBn ? 'নিষিদ্ধ শব্দ: ' : 'Disallowed terms: ') + bannedHits.join(', ')
                    : isBn
                      ? 'BCI Rule 36 মেনে চলতে হবে।'
                      : 'Must comply with BCI Rule 36.'}
                </span>
                <span>{bio.length} / {BIO_MAX}</span>
              </div>
            </div>

            <div>
              <label className="wiz-field-label">{isBn ? 'পরামর্শের ধরন' : 'Consultation availability'} *</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {([
                  { value: 'online', en: 'Online', bn: 'অনলাইন' },
                  { value: 'in_person', en: 'In-person', bn: 'সরাসরি' },
                  { value: 'both', en: 'Both', bn: 'উভয়ই' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`wiz-chip ${availability === opt.value ? 'selected' : ''}`}
                    onClick={() => setAvailability(opt.value)}
                  >
                    {isBn ? opt.bn : opt.en}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* STEP 4 — Documents */}
        {step === 4 && (
          <section>
            <h2 className="wiz-section-title">
              {isBn ? '৪. শংসাপত্র আপলোড' : '4. Document Upload'}
            </h2>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {isBn
                ? 'আপনার নথিগুলি ২৪–৪৮ ঘণ্টার মধ্যে পর্যালোচনা করা হয়। যাচাইকৃত হলে আপনি অনুরোধ গ্রহণ করতে পারবেন।'
                : 'Your documents are reviewed within 24–48 hours. You can start receiving requests once verified.'}
            </p>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div className="doc-drop">
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📜</div>
                <div style={{ fontWeight: 700, color: '#0D1B2A' }}>
                  {isBn ? 'Certificate of Practice (CoP) *' : 'Certificate of Practice (CoP) *'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                  PDF / PNG / JPG · {isBn ? 'সর্বোচ্চ ৫MB' : 'Max 5 MB'}
                </div>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  disabled={uploadingDoc}
                  onChange={e => handleFileUpload(e, 'cop')}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                />
              </div>

              <div className="doc-drop" style={{ borderColor: 'rgba(13,27,42,0.18)', background: '#FAFAFA' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🪪</div>
                <div style={{ fontWeight: 700, color: '#0D1B2A' }}>
                  {isBn ? 'বার কাউন্সিল আইডি কার্ড (ঐচ্ছিক)' : 'Bar Council ID card (optional, recommended)'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                  PDF / PNG / JPG · {isBn ? 'সর্বোচ্চ ৫MB' : 'Max 5 MB'}
                </div>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  disabled={uploadingDoc}
                  onChange={e => handleFileUpload(e, 'bar_id')}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#374151', marginBottom: '0.75rem' }}>
                {isBn ? 'আপলোড করা নথি' : 'Uploaded documents'} ({uploadedDocs.length})
              </h4>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {uploadedDocs.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', border: '1px dashed #E5E7EB', borderRadius: '0.75rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                    {isBn ? 'এখনও কোনো নথি আপলোড হয়নি।' : 'No documents uploaded yet.'}
                  </div>
                ) : (
                  uploadedDocs.map(doc => (
                    <div key={doc.id} className="doc-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>📄</span>
                        <div>
                          <div style={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>
                            {doc.label === 'bar_id' ? 'Bar Council ID' : 'Certificate of Practice'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                            {new Date(doc.uploaded_at).toLocaleDateString(isBn ? 'bn-IN' : 'en-IN')}
                          </div>
                        </div>
                      </div>
                      <a
                        href={doc.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#C9A84C', fontWeight: 600 }}
                      >
                        {isBn ? 'দেখুন' : 'View'}
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: '1.5rem',
                background: 'rgba(201,168,76,0.08)',
                border: '1px solid rgba(201,168,76,0.25)',
                padding: '1rem 1.25rem',
                borderRadius: '0.75rem',
                fontSize: '0.85rem',
                color: '#A0803A',
                lineHeight: 1.55,
              }}
            >
              {isBn
                ? 'জমা দিয়ে আপনি নিশ্চিত করছেন যে উপরের সমস্ত তথ্য সঠিক ও আপনার নিজস্ব। ভুল তথ্য প্রদান করলে আপনার প্রোফাইল অবিলম্বে স্থগিত হতে পারে।'
                : 'By submitting, you declare that all information above is accurate and belongs to you. Misrepresentations may result in immediate suspension.'}
            </div>
          </section>
        )}

        <div className="wiz-nav">
          {step > 1 ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStep(step - 1)}
              disabled={saving || submitting}
            >
              ← {isBn ? 'পেছনে' : 'Back'}
            </button>
          ) : (
            <span />
          )}
          {step < 4 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => saveAndAdvance(step + 1)}
              disabled={saving}
            >
              {saving
                ? isBn
                  ? 'সংরক্ষণ হচ্ছে…'
                  : 'Saving…'
                : isBn
                  ? 'সংরক্ষণ ও পরবর্তী'
                  : 'Save & continue'}{' '}
              →
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #E2C475 100%)', color: '#0D1B2A' }}
              onClick={handleSubmitForVerification}
              disabled={submitting || uploadedDocs.length === 0}
            >
              {submitting
                ? isBn
                  ? 'জমা হচ্ছে…'
                  : 'Submitting…'
                : isBn
                  ? 'যাচাইকরণের জন্য জমা দিন'
                  : 'Submit for verification'}{' '}
              ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
