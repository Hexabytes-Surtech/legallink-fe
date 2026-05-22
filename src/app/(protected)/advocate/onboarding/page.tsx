'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';
import { USE_MOCK, mockDelay } from '@/data/mock';
import type { Advocate } from '@/types';

interface DocumentInfo {
  id: string;
  file_path: string;
  file_type: string;
  uploaded_at: string;
}

export default function OnboardingWizardPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [barNumber, setBarNumber] = useState('');
  const [stateBar, setStateBar] = useState('West Bengal');

  const [practiceAreas, setPracticeAreas] = useState<string[]>([]);
  const [courts, setCourts] = useState<string[]>([]);
  const [newCourt, setNewCourt] = useState('');
  const [languages, setLanguages] = useState<string[]>(['en']);
  const [districts, setDistricts] = useState<string[]>([]);

  const [uploadedDocs, setUploadedDocs] = useState<DocumentInfo[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Practice Areas & District Options
  const practiceAreaOptions = [
    { value: 'family', labelEn: 'Family Law', labelBn: 'পারিবারিক আইন' },
    { value: 'criminal', labelEn: 'Criminal Law', labelBn: 'ফৌজদারি আইন' },
    { value: 'property', labelEn: 'Property Law', labelBn: 'সম্পত্তি আইন' },
    { value: 'tenancy', labelEn: 'Tenancy & Housing', labelBn: 'ভাড়াটে ও আবাসন আইন' },
    { value: 'civil', labelEn: 'Civil Law', labelBn: 'দেওয়ানি আইন' },
    { value: 'consumer', labelEn: 'Consumer Protection', labelBn: 'ভোক্তা অধিকার' },
    { value: 'labour', labelEn: 'Labour & Employment', labelBn: 'শ্রম ও কর্মসংস্থান' },
    { value: 'corporate', labelEn: 'Corporate Law', labelBn: 'কর্পোরেট আইন' },
    { value: 'tax', labelEn: 'Tax Law', labelBn: 'কর আইন' },
    { value: 'motor_vehicle', labelEn: 'Motor Vehicle Disputes', labelBn: 'মোটর যান বিতর্ক' },
    { value: 'land_disputes', labelEn: 'Land Disputes', labelBn: 'ভূমি বিরোধ' },
  ];

  const districtOptions = [
    { value: 'kolkata', labelEn: 'Kolkata', labelBn: 'কলকাতা' },
    { value: 'howrah', labelEn: 'Howrah', labelBn: 'হাওড়া' },
    { value: 'north_24_parganas', labelEn: 'North 24 Parganas', labelBn: 'উত্তর ২৪ পরগণা' },
    { value: 'south_24_parganas', labelEn: 'South 24 Parganas', labelBn: 'দক্ষিণ ২৪ পরগণা' },
    { value: 'hooghly', labelEn: 'Hooghly', labelBn: 'হুগলি' },
    { value: 'burdwan', labelEn: 'Burdwan', labelBn: 'বর্ধমান' },
    { value: 'murshidabad', labelEn: 'Murshidabad', labelBn: 'মুর্শিদাবাদ' },
    { value: 'nadia', labelEn: 'Nadia', labelBn: 'নদীয়া' },
    { value: 'medinipur', labelEn: 'Medinipur', labelBn: 'মেদিনীপুর' },
    { value: 'bankura', labelEn: 'Bankura', labelBn: 'বাঁকুড়া' },
  ];

  const stateBarOptions = [
    'West Bengal',
    'Delhi',
    'Maharashtra & Goa',
    'Karnataka',
    'Tamil Nadu',
    'Uttar Pradesh',
  ];

  const languageOptions = [
    { value: 'en', labelEn: 'English', labelBn: 'ইংরেজি' },
    { value: 'bn', labelEn: 'Bengali', labelBn: 'বাংলা' },
    { value: 'hi', labelEn: 'Hindi', labelBn: 'হিন্দি' },
  ];

  const populateState = useCallback((data: Advocate) => {
    setName(data.name || '');
    setPhone(data.phone || '');
    setAddress(data.address || '');
    setEmail(data.advocate_email || data.email || user?.email || '');
    setBarNumber(data.bar_enrolment_number || data.barEnrolmentNumber || '');
    setStateBar(data.state_bar || data.stateBar || 'West Bengal');
    setPracticeAreas(data.practice_areas || data.practiceAreas || []);
    setCourts(data.courts || []);
    setLanguages(data.languages || ['en']);
    setDistricts(data.districts || []);
  }, [user]);

  // 1. Fetch existing profile on mount
  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError('');
      try {
        if (USE_MOCK) {
          await mockDelay(500);
          const cached = localStorage.getItem('mock_advocate_profile');
          if (cached) {
            const data = JSON.parse(cached) as Advocate;
            populateState(data);
          } else {
            // default mock values from logged-in user
            setEmail(user?.email || '');
          }

          const cachedDocs = localStorage.getItem('mock_advocate_documents');
          if (cachedDocs) {
            setUploadedDocs(JSON.parse(cachedDocs));
          }
        } else {
          // Real mode
          const res = await apiClient<Advocate>('/advocate/me');
          if (res.success && res.data) {
            populateState(res.data);
          }

          const docsRes = await apiClient<DocumentInfo[]>('/advocate/documents');
          if (docsRes.success && docsRes.data) {
            setUploadedDocs(docsRes.data);
          }
        }
      } catch {
        setError(language === 'en' ? 'Failed to fetch existing profile details' : 'বিদ্যমান প্রোফাইলের বিবরণ পেতে ব্যর্থ হয়েছে');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadProfile();
    }
  }, [user, language, populateState]);

  // Calculate completeness score
  const completenessDetails = [
    { name: 'Name', checked: !!name },
    { name: 'Phone', checked: !!phone },
    { name: 'Email', checked: !!email },
    { name: 'Address', checked: !!address },
    { name: 'Bar Enrolment Number', checked: !!barNumber },
    { name: 'State Bar Council', checked: !!stateBar },
    { name: 'Practice Areas', checked: practiceAreas.length > 0 },
    { name: 'Courts', checked: courts.length > 0 },
    { name: 'Languages Known', checked: languages.length > 0 },
    { name: 'Districts Served', checked: districts.length > 0 },
    { name: 'Verification Certificates', checked: uploadedDocs.length > 0 },
  ];

  const completedCount = completenessDetails.filter(d => d.checked).length;
  const completenessScore = Math.round((completedCount / completenessDetails.length) * 100);

  // Progressive Save
  async function saveProgress(targetStep?: number) {
    setError('');
    setSaving(true);
    try {
      const payload: Partial<Advocate> = {
        name,
        phone,
        address,
        email,
        advocate_email: email,
        barEnrolmentNumber: barNumber,
        bar_enrolment_number: barNumber,
        stateBar,
        state_bar: stateBar,
        practiceAreas,
        practice_areas: practiceAreas,
        courts,
        languages,
        districts,
      };

      if (USE_MOCK) {
        await mockDelay(300);
        // Save to localStorage
        const cached = localStorage.getItem('mock_advocate_profile');
        const existing = cached ? JSON.parse(cached) : {};
        const merged = {
          ...existing,
          ...payload,
          verification_status: existing.verification_status || 'pending',
        };
        localStorage.setItem('mock_advocate_profile', JSON.stringify(merged));
      } else {
        const res = await apiClient<Advocate>('/advocate/profile', {
          method: 'PUT',
          body: payload,
        });
        if (!res.success) {
          throw new Error(res.error || 'Failed to update profile');
        }
      }

      // Notify Sidebar Layout to update profile details dynamically
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('advocate-profile-updated'));
      }

      if (targetStep) {
        setStep(targetStep);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save progress.');
    } finally {
      setSaving(false);
    }
  }

  // Upload CoP Certificate
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError('');
    setUploadingDoc(true);

    const file = files[0];
    try {
      if (USE_MOCK) {
        await mockDelay(600);
        const newDoc: DocumentInfo = {
          id: 'mock-doc-' + Date.now(),
          file_path: URL.createObjectURL(file),
          file_type: file.type,
          uploaded_at: new Date().toISOString(),
        };
        const updated = [...uploadedDocs, newDoc];
        setUploadedDocs(updated);
        localStorage.setItem('mock_advocate_documents', JSON.stringify(updated));
      } else {
        const formData = new FormData();
        formData.append('document', file);

        const res = await apiClient<DocumentInfo>('/advocate/documents', {
          method: 'POST',
          formData,
        });

        if (res.success && res.data) {
          setUploadedDocs(prev => [...prev, res.data!]);
        } else {
          throw new Error(res.error || 'Failed to upload document');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uploading file.');
    } finally {
      setUploadingDoc(false);
      e.target.value = ''; // Reset file input
    }
  }

  // Delete uploaded document
  async function handleDeleteDoc(docId: string) {
    setError('');
    try {
      if (USE_MOCK) {
        await mockDelay(300);
        const updated = uploadedDocs.filter(d => d.id !== docId);
        setUploadedDocs(updated);
        localStorage.setItem('mock_advocate_documents', JSON.stringify(updated));
      } else {
        // Assume API has a DELETE /advocate/documents/:id endpoint, or we ignore it if it doesn't.
        // If not in API_REFERENCE, let's keep it locally updated.
        // Actually, API reference does not list a DELETE document endpoint, so we can just mock-delete or skip the call.
        const updated = uploadedDocs.filter(d => d.id !== docId);
        setUploadedDocs(updated);
      }
    } catch {
      setError('Failed to delete document.');
    }
  }

  // Submit profile for verification
  async function handleSubmitVerification() {
    if (completenessScore < 80) {
      setError(language === 'en' 
        ? 'Your profile completeness is too low. Please fill in all fields (minimum 80%).' 
        : 'আপনার প্রোফাইলের সম্পূর্ণতা খুব কম। অনুগ্রহ করে সব তথ্য পূরণ করুন (ন্যূনতম ৮০%)।');
      return;
    }

    setError('');
    setSaving(true);
    try {
      if (USE_MOCK) {
        await mockDelay(800);
        const cached = localStorage.getItem('mock_advocate_profile');
        const profile = cached ? JSON.parse(cached) : {};
        profile.verification_status = 'pending';
        localStorage.setItem('mock_advocate_profile', JSON.stringify(profile));
      } else {
        const res = await apiClient('/advocate/submit-verification', {
          method: 'POST',
        });
        if (!res.success) {
          throw new Error(res.error || 'Failed to submit profile for verification.');
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('advocate-profile-updated'));
      }

      setSuccessMsg(language === 'en' 
        ? 'Your professional profile has been submitted for admin verification. Redirecting to dashboard...'
        : 'আপনার পেশাগত প্রোফাইলটি অ্যাডমিন ভেরিফিকেশনের জন্য জমা দেওয়া হয়েছে। ড্যাশবোর্ডে রিডাইরেক্ট করা হচ্ছে...');
      
      setTimeout(() => {
        router.push('/advocate/dashboard');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSaving(false);
    }
  }

  // Manage Practice Areas Selection
  const togglePracticeArea = (value: string) => {
    setPracticeAreas(prev =>
      prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
    );
  };

  // Manage Districts Selection
  const toggleDistrict = (value: string) => {
    setDistricts(prev =>
      prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
    );
  };

  // Manage Languages Selection
  const toggleLanguageOption = (value: string) => {
    setLanguages(prev =>
      prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
    );
  };

  // Manage Courts List
  const addCourt = () => {
    if (newCourt.trim() && !courts.includes(newCourt.trim())) {
      setCourts(prev => [...prev, newCourt.trim()]);
      setNewCourt('');
    }
  };

  const removeCourt = (index: number) => {
    setCourts(prev => prev.filter((_, idx) => idx !== index));
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem 0', maxWidth: '800px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '3rem', width: '40%', marginBottom: '2rem' }} />
        <div className="skeleton" style={{ height: '200px', borderRadius: '1rem', marginBottom: '1.5rem' }} />
        <div className="skeleton" style={{ height: '60px', borderRadius: '0.5rem' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', paddingBottom: '4rem' }}>
      <style>{`
        .wizard-card {
          background: white;
          border-radius: 1.25rem;
          padding: 2.5rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.04);
          border: 1px solid rgba(201,168,76,0.15);
        }
        .wizard-steps {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2.5rem;
          position: relative;
        }
        .wizard-steps::before {
          content: '';
          position: absolute;
          top: 14px;
          left: 5%;
          right: 5%;
          height: 3px;
          background: rgba(13,27,42,0.1);
          z-index: 1;
        }
        .step-bubble {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: white;
          border: 3px solid rgba(13,27,42,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
          z-index: 2;
          color: #6B7280;
          transition: all 0.3s;
        }
        .step-bubble.active {
          border-color: #0D1B2A;
          background: #0D1B2A;
          color: white;
          box-shadow: 0 0 0 5px rgba(13,27,42,0.15);
        }
        .step-bubble.completed {
          border-color: #C9A84C;
          background: #C9A84C;
          color: #0D1B2A;
        }
        .step-label {
          position: absolute;
          top: 38px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
          transform: translateX(-35%);
        }
        .step-bubble.active + .step-label {
          color: #0D1B2A;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 600px) {
          .form-grid { grid-template-columns: 1fr; }
          .wizard-steps { display: none; }
        }
        .checkbox-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }
        .checkbox-card {
          border: 1.5px solid #E5E7EB;
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
          font-size: 0.9rem;
        }
        .checkbox-card.selected {
          border-color: #C9A84C;
          background: rgba(201,168,76,0.06);
          color: #0D1B2A;
        }
        .court-badge {
          background: rgba(13,27,42,0.05);
          border: 1px solid rgba(13,27,42,0.1);
          color: #0D1B2A;
          padding: 6px 12px;
          border-radius: 9999px;
          font-size: 0.85rem;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
        }
        .court-badge button {
          border: none;
          background: none;
          color: #EF4444;
          font-weight: bold;
          cursor: pointer;
          padding: 0;
          font-size: 1rem;
        }
        .progress-bar-container {
          background: #E5E7EB;
          border-radius: 9999px;
          height: 8px;
          overflow: hidden;
          margin: 1.5rem 0;
        }
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(to right, #0D1B2A, #C9A84C);
          transition: width 0.4s ease;
        }
      `}</style>

      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-headline" style={{ color: 'var(--color-navy)', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
          {language === 'en' ? 'Advocate Onboarding' : 'অ্যাডভোকেট অনবোর্ডিং'}
        </h1>
        <p style={{ color: 'var(--color-gray-500)', fontSize: '1.0625rem', marginTop: '0.25rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
          {language === 'en'
            ? 'Complete your professional credentials to request verification by the state administrator.'
            : 'রাজ্য প্রশাসকের দ্বারা যাচাইকরণের অনুরোধ করতে আপনার পেশাগত পরিচয়পত্র সম্পূর্ণ করুন।'}
        </p>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '1.25rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#059669', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: 600, fontSize: '1.05rem', textAlign: 'center' }}>
          {successMsg}
        </div>
      )}

      <div className="wizard-card">
        {/* Step Indicator Header */}
        <div className="wizard-steps">
          {[1, 2, 3, 4, 5].map(idx => (
            <div key={idx} style={{ position: 'relative' }}>
              <div className={`step-bubble ${step === idx ? 'active' : ''} ${step > idx ? 'completed' : ''}`}>
                {step > idx ? '✓' : idx}
              </div>
              <span className="step-label" style={{ left: idx === 1 ? '16px' : idx === 5 ? '-16px' : '50%' }}>
                {idx === 1 && (language === 'en' ? 'Profile' : 'প্রোফাইল')}
                {idx === 2 && (language === 'en' ? 'Bar Enrol' : 'বার নথি')}
                {idx === 3 && (language === 'en' ? 'Practice' : 'অনুশীলন')}
                {idx === 4 && (language === 'en' ? 'Certificates' : 'সার্টিফিকেট')}
                {idx === 5 && (language === 'en' ? 'Submit' : 'জমা দিন')}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '1.25rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
              1. {language === 'en' ? 'Personal & Contact Information' : 'ব্যক্তিগত এবং যোগাযোগের তথ্য'}
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Full Professional Name' : 'পূর্ণ পেশাগত নাম'} <span style={{ color: 'red' }}>*</span>
                </label>
                <input className="input" type="text" placeholder="Adv. John Doe" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Contact Email' : 'যোগাযোগের ইমেল'} <span style={{ color: 'red' }}>*</span>
                </label>
                <input className="input" type="email" placeholder="john.doe@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Mobile Number' : 'মোবাইল নম্বর'} <span style={{ color: 'red' }}>*</span>
                </label>
                <input className="input" type="tel" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Chamber / Office Address' : 'চেম্বার / অফিস ঠিকানা'} <span style={{ color: 'red' }}>*</span>
                </label>
                <input className="input" type="text" placeholder="Room 4, Court Building, Kolkata" value={address} onChange={e => setAddress(e.target.value)} required />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Bar Details */}
        {step === 2 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '1.25rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
              2. {language === 'en' ? 'Bar Association Enrolment' : 'বার অ্যাসোসিয়েশন নথিভুক্তি'}
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'BCI Enrolment Number' : 'বার কাউন্সিল নথিভুক্তি নম্বর'} <span style={{ color: 'red' }}>*</span>
                </label>
                <input className="input" type="text" placeholder="e.g. WB/1234/2020" value={barNumber} onChange={e => setBarNumber(e.target.value)} required />
                <span style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem', display: 'block' }}>
                  {language === 'en' ? 'Format must match your Certificate of Practice (CoP).' : 'ফরমেট অবশ্যই আপনার সার্টিফিকেট অফ প্র্যাকটিস (CoP) এর সাথে মিলতে হবে।'}
                </span>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'State Bar Council' : 'রাজ্য বার কাউন্সিল'} <span style={{ color: 'red' }}>*</span>
                </label>
                <select className="input" value={stateBar} onChange={e => setStateBar(e.target.value)} style={{ paddingRight: '2rem' }}>
                  {stateBarOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Practice Details */}
        {step === 3 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '1.25rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
              3. {language === 'en' ? 'Practice Specialization & Territories' : 'অনুশীলন বিশেষীকরণ এবং অঞ্চল'}
            </h3>

            {/* Languages Known */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                {language === 'en' ? 'Languages Spoken' : 'কথ্য ভাষা'} <span style={{ color: 'red' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                {languageOptions.map(opt => {
                  const isSelected = languages.includes(opt.value);
                  return (
                    <div key={opt.value} className={`checkbox-card ${isSelected ? 'selected' : ''}`} onClick={() => toggleLanguageOption(opt.value)} style={{ flex: 1, justifyContent: 'center' }}>
                      <input type="checkbox" checked={isSelected} readOnly style={{ pointerEvents: 'none' }} />
                      <span>{language === 'en' ? opt.labelEn : opt.labelBn}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Practice Areas */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                {language === 'en' ? 'Specialised Practice Areas' : 'বিশেষায়িত অনুশীলনের ক্ষেত্র'} <span style={{ color: 'red' }}>*</span>
              </label>
              <div className="checkbox-grid">
                {practiceAreaOptions.map(opt => {
                  const isSelected = practiceAreas.includes(opt.value);
                  return (
                    <div key={opt.value} className={`checkbox-card ${isSelected ? 'selected' : ''}`} onClick={() => togglePracticeArea(opt.value)}>
                      <input type="checkbox" checked={isSelected} readOnly style={{ pointerEvents: 'none' }} />
                      <span>{language === 'en' ? opt.labelEn : opt.labelBn}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Serving Districts */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                {language === 'en' ? 'Serving Districts (West Bengal)' : 'সেবা প্রদানের জেলা (পশ্চিমবঙ্গ)'} <span style={{ color: 'red' }}>*</span>
              </label>
              <div className="checkbox-grid">
                {districtOptions.map(opt => {
                  const isSelected = districts.includes(opt.value);
                  return (
                    <div key={opt.value} className={`checkbox-card ${isSelected ? 'selected' : ''}`} onClick={() => toggleDistrict(opt.value)}>
                      <input type="checkbox" checked={isSelected} readOnly style={{ pointerEvents: 'none' }} />
                      <span>{language === 'en' ? opt.labelEn : opt.labelBn}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Courts Tag List */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                {language === 'en' ? 'Courts of Practice' : 'অনুশীলনের আদালত'} <span style={{ color: 'red' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input className="input" type="text" placeholder={language === 'en' ? 'e.g. Calcutta High Court' : 'যেমন: কলকাতা হাইকোর্ট'} value={newCourt} onChange={e => setNewCourt(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCourt())} />
                <button type="button" className="btn btn-secondary" onClick={addCourt}>
                  {language === 'en' ? 'Add' : 'যুক্ত করুন'}
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {courts.map((court, idx) => (
                  <span key={idx} className="court-badge">
                    {court}
                    <button type="button" onClick={() => removeCourt(idx)} aria-label="Remove court">×</button>
                  </span>
                ))}
                {courts.length === 0 && (
                  <span style={{ fontSize: '0.875rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                    {language === 'en' ? 'No courts added yet.' : 'এখনও কোনো আদালত যুক্ত করা হয়নি।'}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Documents Upload */}
        {step === 4 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '1.25rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
              4. {language === 'en' ? 'Verify Credentials' : 'শংসাপত্র যাচাই করুন'}
            </h3>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {language === 'en'
                ? 'Upload clear scanned copies of your Bar Council Registration Certificate or Certificate of Practice (CoP). Acceptable formats: PDF, PNG, JPG (Max 5MB).'
                : 'আপনার বার কাউন্সিল রেজিস্ট্রেশন সার্টিফিকেট বা সার্টিফিকেট অফ প্র্যাকটিস (CoP) এর স্পষ্ট স্ক্যান করা কপি আপলোড করুন। গ্রহণযোগ্য ফরম্যাট: PDF, PNG, JPG (সর্বোচ্চ ৫ মেগাবাইট)।'}
            </p>

            <div style={{
              border: '2px dashed rgba(201,168,76,0.3)',
              borderRadius: '1rem',
              padding: '2.5rem',
              textAlign: 'center',
              background: 'rgba(201,168,76,0.02)',
              marginBottom: '2rem',
              position: 'relative',
              transition: 'border-color 0.2s',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📁</div>
              <h4 style={{ fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
                {language === 'en' ? 'Upload your certificate' : 'আপনার সার্টিফিকেট আপলোড করুন'}
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '1.25rem' }}>
                Drag and drop your file here, or click to browse
              </p>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} disabled={uploadingDoc} style={{
                position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer',
              }} />
              {uploadingDoc && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '1rem', fontWeight: 600, color: '#0D1B2A' }}>
                  {language === 'en' ? 'Uploading document...' : 'নথি আপলোড করা হচ্ছে...'}
                </div>
              )}
            </div>

            {/* List of uploaded files */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#374151', marginBottom: '0.75rem' }}>
                {language === 'en' ? 'Uploaded Documents' : 'আপলোড করা নথিপত্র'} ({uploadedDocs.length})
              </h4>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {uploadedDocs.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>📄</span>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Certificate_{doc.id.substring(0, 8)}.{doc.file_type.split('/')[1] || 'pdf'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                          Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <a href={doc.file_path} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: '0.8rem', color: '#C9A84C', fontWeight: 600 }}>
                        {language === 'en' ? 'View' : 'দেখুন'}
                      </a>
                      <button type="button" onClick={() => handleDeleteDoc(doc.id)} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: '0.8rem', color: '#EF4444' }}>
                        {language === 'en' ? 'Delete' : 'মুছুন'}
                      </button>
                    </div>
                  </div>
                ))}
                {uploadedDocs.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed #E5E7EB', borderRadius: '0.75rem', color: '#9CA3AF', fontSize: '0.875rem', fontStyle: 'italic' }}>
                    {language === 'en' ? 'No documents uploaded yet.' : 'এখনও কোনো নথি আপলোড করা হয়নি।'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {step === 5 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '1.25rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
              5. {language === 'en' ? 'Review & Submit for Verification' : 'পর্যালোচনা এবং যাচাইয়ের জন্য জমা দিন'}
            </h3>

            {/* Profile Completeness Score */}
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '1rem', padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#374151' }}>
                  {language === 'en' ? 'Profile Completeness' : 'প্রোফাইলের সম্পূর্ণতা'}
                </span>
                <span style={{ fontWeight: 800, color: completenessScore >= 80 ? '#059669' : '#DC2626', fontSize: '1.25rem' }}>
                  {completenessScore}%
                </span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${completenessScore}%` }} />
              </div>
              <p style={{ fontSize: '0.825rem', color: '#6B7280' }}>
                {language === 'en'
                  ? 'A score of at least 80% is required to submit your profile for admin verification. Please fill out missing details if your score is below 80%.'
                  : 'প্রশাসক যাচাইকরণের জন্য আপনার প্রোফাইল জমা দিতে কমপক্ষে ৮০% স্কোর প্রয়োজন। স্কোর ৮০% এর নিচে হলে অনুপস্থিত তথ্যগুলো পূরণ করুন।'}
              </p>
            </div>

            {/* Details Summary CheckList */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#374151', marginBottom: '0.75rem' }}>
                {language === 'en' ? 'Profile Verification Checklist' : 'প্রোফাইল যাচাই চেকলিস্ট'}
              </h4>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {completenessDetails.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: item.checked ? '#374151' : '#9CA3AF' }}>
                    <span style={{ fontSize: '1.1rem', color: item.checked ? '#059669' : '#DC2626' }}>
                      {item.checked ? '✓' : '✗'}
                    </span>
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', padding: '1rem 1.25rem', borderRadius: '0.75rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#A0803A', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                {language === 'en'
                  ? 'By submitting, you declare that the bar association details, CoP certificates, and districts declared are fully accurate and belong to you. Misrepresentations may result in immediate suspension.'
                  : 'জমা দেওয়ার মাধ্যমে, আপনি ঘোষণা করছেন যে বার অ্যাসোসিয়েশনের বিবরণ, CoP সার্টিফিকেট এবং ঘোষিত জেলাগুলি সম্পূর্ণ সঠিক এবং আপনার নিজস্ব। ভুল তথ্য দিলে অবিলম্বে স্থগিতাদেশ হতে পারে।'}
              </p>
            </div>
          </div>
        )}

        {/* Wizard Navigation Footer Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E5E7EB', marginTop: '2.5rem', paddingTop: '1.5rem' }}>
          {step > 1 ? (
            <button type="button" className="btn btn-secondary" onClick={() => saveProgress(step - 1)} disabled={saving}>
              ← {language === 'en' ? 'Back' : 'পেছনে'}
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button type="button" className="btn btn-primary" style={{ background: 'linear-gradient(to right, #0D1B2A, #182C40)', borderColor: '#0D1B2A' }} onClick={() => saveProgress(step + 1)} disabled={saving}>
              {saving ? (language === 'en' ? 'Saving...' : 'সংরক্ষণ হচ্ছে...') : (language === 'en' ? 'Save & Continue' : 'সংরক্ষণ এবং এগিয়ে যান')} →
            </button>
          ) : (
            <button type="button" className="btn btn-primary" style={{ background: 'linear-gradient(to right, #C9A84C, #E2C475)', borderColor: '#C9A84C', color: '#0D1B2A', fontWeight: 700 }} onClick={handleSubmitVerification} disabled={saving || completenessScore < 80}>
              {saving
                ? (language === 'en' ? 'Submitting...' : 'জমা দেওয়া হচ্ছে...')
                : (language === 'en' ? 'Submit for Verification' : 'যাচাইকরণের জন্য জমা দিন')} ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
