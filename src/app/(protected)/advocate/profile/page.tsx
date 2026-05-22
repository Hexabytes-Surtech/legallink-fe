'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';
import { USE_MOCK, mockDelay } from '@/data/mock';
import type { Advocate } from '@/types';

export default function AdvocateProfilePage() {
  const { language } = useLanguage();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');

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
    setVerificationStatus(data.verification_status || data.verificationStatus || 'pending');
  }, [user]);

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
            setEmail(user?.email || '');
          }
        } else {
          const res = await apiClient<Advocate>('/advocate/me');
          if (res.success && res.data) {
            populateState(res.data);
          } else {
            throw new Error(res.error || 'Failed to fetch profile details.');
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

  // Toggle handlers
  const togglePracticeArea = (value: string) => {
    setPracticeAreas(prev =>
      prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
    );
  };

  const toggleDistrict = (value: string) => {
    setDistricts(prev =>
      prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
    );
  };

  const toggleLanguageOption = (value: string) => {
    setLanguages(prev =>
      prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
    );
  };

  const addCourt = () => {
    if (newCourt.trim() && !courts.includes(newCourt.trim())) {
      setCourts(prev => [...prev, newCourt.trim()]);
      setNewCourt('');
    }
  };

  const removeCourt = (index: number) => {
    setCourts(prev => prev.filter((_, idx) => idx !== index));
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
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
        await mockDelay(600);
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

      setSuccess(language === 'en' ? 'Professional profile saved successfully.' : 'পেশাগত প্রোফাইল সফলভাবে সংরক্ষণ করা হয়েছে।');

      // Dispatch event to sidebar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('advocate-profile-updated'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile details.');
    } finally {
      setSaving(false);
    }
  }

  // Calculate completeness score
  const fields = [name, phone, address, barNumber, stateBar];
  const completedFields = fields.filter(Boolean).length;
  const completeness = Math.round((completedFields / fields.length) * 100);

  if (loading) {
    return (
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '3.5rem', width: '30%', marginBottom: '2.5rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          <div className="skeleton" style={{ height: '500px', borderRadius: '1.25rem' }} />
          <div className="skeleton" style={{ height: '300px', borderRadius: '1.25rem' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      <style>{`
        .profile-container {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
          align-items: start;
        }
        @media (max-width: 768px) {
          .profile-container {
            grid-template-columns: 1fr;
          }
        }
        .form-section {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 1.25rem;
          padding: 2rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
        }
        .section-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--color-navy);
          margin-bottom: 1.25rem;
          border-bottom: 1px solid #F3F4F6;
          padding-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          margin-bottom: 1rem;
        }
        @media (max-width: 600px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
        .sidebar-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 1.25rem;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
          position: sticky;
          top: 2rem;
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
      `}</style>

      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="text-headline" style={{ color: 'var(--color-navy)', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
          {language === 'en' ? 'Professional Profile' : 'পেশাগত প্রোফাইল'}
        </h1>
        <p style={{ color: 'var(--color-gray-500)', fontSize: '1.05rem', marginTop: '0.25rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
          {language === 'en'
              ? 'Update your professional credentials, districts, and practice specializations.'
              : 'আপনার পেশাগত পরিচয়পত্র, জেলা এবং অনুশীলনের বিশেষীকরণগুলি হালনাগাদ করুন।'}
        </p>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#059669', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: 600 }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="profile-container">
        {/* Left Column: Form Cards */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Card 1: Personal Details */}
          <div className="form-section">
            <h3 className="section-title">
              👤 {language === 'en' ? 'Personal Details' : 'ব্যক্তিগত তথ্য'}
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Full Professional Name' : 'পূর্ণ নাম'} <span style={{ color: 'red' }}>*</span>
                </label>
                <input className="input" type="text" placeholder="Advocate Name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Professional Email' : 'পেশাগত ইমেল'} <span style={{ color: 'red' }}>*</span>
                </label>
                <input className="input" type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
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
                  {language === 'en' ? 'Office / Chamber Address' : 'অফিস / চেম্বার ঠিকানা'} <span style={{ color: 'red' }}>*</span>
                </label>
                <input className="input" type="text" placeholder="Kolkata Court Complex" value={address} onChange={e => setAddress(e.target.value)} required />
              </div>
            </div>
          </div>

          {/* Card 2: Bar council details */}
          <div className="form-section">
            <h3 className="section-title">
              ⚖️ {language === 'en' ? 'Bar Council Credentials' : 'বার কাউন্সিল শংসাপত্র'}
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'BCI Enrolment Number' : 'বার নথিভুক্তি নম্বর'} <span style={{ color: 'red' }}>*</span>
                </label>
                <input className="input" type="text" placeholder="e.g. WB/1234/2019" value={barNumber} onChange={e => setBarNumber(e.target.value)} required />
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

          {/* Card 3: Specialty details */}
          <div className="form-section">
            <h3 className="section-title">
              🎓 {language === 'en' ? 'Practice & Specialty' : 'অনুশীলন ও বিশেষত্ব'}
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
                {language === 'en' ? 'Serving Districts (West Bengal)' : 'সেবা প্রদানের জেলা'} <span style={{ color: 'red' }}>*</span>
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
            <div>
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

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ background: 'linear-gradient(to right, #0D1B2A, #243B55)', borderColor: '#0D1B2A', color: 'white', fontWeight: 700, padding: '0.75rem 2rem' }}>
              {saving ? (language === 'en' ? 'Saving Details...' : 'সংরক্ষণ করা হচ্ছে...') : (language === 'en' ? 'Save Profile' : 'প্রোফাইল সংরক্ষণ করুন')}
            </button>
          </div>
        </div>

        {/* Right Column: Profile Summary Sidebar */}
        <div className="sidebar-card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #F3F4F6', paddingBottom: '1.5rem' }}>
            <div style={{
              width: '5.5rem',
              height: '5.5rem',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0D1B2A 0%, #C9A84C 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.25rem',
              fontWeight: 800,
              margin: '0 auto 1rem',
              boxShadow: '0 8px 25px rgba(13,27,42,0.15)'
            }}>
              {name ? name.substring(0, 2).toUpperCase() : 'AD'}
            </div>

            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-navy)', margin: '0 0 0.35rem 0' }}>
              Adv. {name || 'New Advocate'}
            </h4>
            
            <span className={`badge ${verificationStatus === 'verified' ? 'badge-green' : verificationStatus === 'rejected' ? 'badge-red' : 'badge-navy'}`} style={{ textTransform: 'capitalize', fontSize: '0.75rem', fontWeight: 700 }}>
              {verificationStatus === 'verified' ? 'verified' : verificationStatus === 'rejected' ? 'rejected' : 'under review'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '0.04em' }}>
                {language === 'en' ? 'Bar Registration' : 'বার নথিভুক্তি'}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-navy)', marginTop: '2px' }}>
                {barNumber || 'Not entered yet'}
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '0.04em' }}>
                {language === 'en' ? 'Completeness Index' : 'তথ্য সম্পূর্ণতা সূচক'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
                <div style={{ flex: 1, height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#C9A84C', width: `${completeness}%` }} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-navy)' }}>{completeness}%</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
