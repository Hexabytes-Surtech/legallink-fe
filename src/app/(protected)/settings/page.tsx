'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';
import { USE_MOCK, mockDelay } from '@/data/mock';

interface FullProfile {
  id: string;
  email: string;
  name: string | null;
  address: string | null;
  preferred_language: string | null;
  avatar_url: string | null;
  role: string;
}

export default function SettingsPage() {
  const { language, setLanguage } = useLanguage();
  const { user, updateUser, logout } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Profile card state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [prefLang, setPrefLang] = useState<'en' | 'bn'>('en');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Avatar card state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState('');

  useEffect(() => {
    async function loadProfile() {
      setLoadingProfile(true);
      try {
        if (USE_MOCK) {
          await mockDelay(400);
          const stored = localStorage.getItem('mock_user_profile');
          const base: FullProfile = stored
            ? JSON.parse(stored)
            : {
                id: user?.userId ?? 'mock-user',
                email: user?.email ?? 'citizen@example.com',
                name: user?.name ?? '',
                address: '',
                preferred_language: 'en',
                avatar_url: user?.avatar_url ?? null,
                role: user?.role ?? 'citizen',
              };
          setProfile(base);
          setName(base.name ?? '');
          setAddress(base.address ?? '');
          setPrefLang((base.preferred_language as 'en' | 'bn') ?? 'en');
        } else {
          const res = await apiClient<FullProfile>('/user/me');
          if (res.success && res.data) {
            setProfile(res.data);
            setName(res.data.name ?? '');
            setAddress(res.data.address ?? '');
            setPrefLang((res.data.preferred_language as 'en' | 'bn') ?? 'en');
          } else {
            throw new Error(res.error ?? 'Failed to load profile');
          }
        }
      } catch {
        // non-fatal — user can still see/edit with empty fields
      } finally {
        setLoadingProfile(false);
      }
    }

    if (user) loadProfile();
  }, [user]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setSavingProfile(true);

    try {
      if (USE_MOCK) {
        await mockDelay(600);
        const updated = { ...profile!, name: name.trim(), address: address.trim(), preferred_language: prefLang };
        setProfile(updated);
        localStorage.setItem('mock_user_profile', JSON.stringify(updated));
        updateUser({ name: name.trim() });
      } else {
        const res = await apiClient('/user/profile', {
          method: 'PUT',
          body: { name: name.trim(), address: address.trim(), preferred_language: prefLang },
        });
        if (!res.success) throw new Error(res.error ?? 'Failed to save profile');
        updateUser({ name: name.trim() });
      }

      if (prefLang !== language) setLanguage(prefLang);
      setProfileSuccess(language === 'en' ? 'Profile saved successfully!' : 'প্রোফাইল সফলভাবে সংরক্ষিত হয়েছে!');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : (language === 'en' ? 'Failed to save profile.' : 'প্রোফাইল সংরক্ষণ ব্যর্থ হয়েছে।'));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError('');
    setAvatarSuccess('');

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError(language === 'en' ? 'Image too large (max 2MB)' : 'ছবি খুব বড় (সর্বোচ্চ ২MB)');
      e.target.value = '';
      return;
    }

    setUploadingAvatar(true);
    try {
      if (USE_MOCK) {
        await mockDelay(700);
        const objectUrl = URL.createObjectURL(file);
        updateUser({ avatar_url: objectUrl });
        setProfile(prev => prev ? { ...prev, avatar_url: objectUrl } : prev);
        setAvatarSuccess(language === 'en' ? 'Photo updated!' : 'ছবি আপডেট হয়েছে!');
      } else {
        const fd = new FormData();
        fd.append('avatar', file);
        const res = await apiClient<{ avatar_url: string }>('/user/avatar', { method: 'POST', formData: fd });
        if (res.success && res.data?.avatar_url) {
          updateUser({ avatar_url: res.data.avatar_url });
          setProfile(prev => prev ? { ...prev, avatar_url: res.data!.avatar_url } : prev);
          setAvatarSuccess(language === 'en' ? 'Photo updated!' : 'ছবি আপডেট হয়েছে!');
        } else {
          throw new Error(res.error ?? 'Upload failed');
        }
      }
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : (language === 'en' ? 'Upload failed.' : 'আপলোড ব্যর্থ হয়েছে।'));
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  }

  const initials = (user?.name ?? user?.email ?? 'U')[0].toUpperCase();
  const avatarUrl = profile?.avatar_url ?? user?.avatar_url;

  if (loadingProfile) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div className="skeleton" style={{ height: '3rem', width: '35%', marginBottom: '2.5rem' }} />
        <div className="skeleton" style={{ height: '280px', borderRadius: '1.25rem', marginBottom: '1.5rem' }} />
        <div className="skeleton" style={{ height: '180px', borderRadius: '1.25rem' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <style>{`
        .settings-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 1.25rem;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          margin-bottom: 1.5rem;
        }
        .settings-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 0.4rem;
        }
        .settings-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1.5px solid #E5E7EB;
          border-radius: 0.75rem;
          font-size: 0.9375rem;
          color: var(--color-navy);
          background: #FAFAF9;
          outline: none;
          transition: border-color 0.15s;
          box-sizing: border-box;
        }
        .settings-input:focus { border-color: #C9A84C; background: white; }
        .settings-input:disabled { opacity: 0.6; cursor: not-allowed; }
        .settings-input-readonly {
          background: #F3F4F6;
          color: #9CA3AF;
          cursor: default;
        }
        .lang-radio-group {
          display: flex;
          gap: 0.75rem;
        }
        .lang-radio-label {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border: 1.5px solid #E5E7EB;
          border-radius: 0.75rem;
          cursor: pointer;
          font-size: 0.9375rem;
          font-weight: 500;
          color: #6B7280;
          transition: all 0.15s;
          background: #FAFAF9;
        }
        .lang-radio-label.selected {
          border-color: #C9A84C;
          background: rgba(201,168,76,0.06);
          color: var(--color-navy);
          font-weight: 600;
        }
        .lang-radio-label input { display: none; }
        .avatar-preview {
          width: 5rem;
          height: 5rem;
          border-radius: 9999px;
          background: linear-gradient(135deg, #C9A84C, #E2C475);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          color: #0D1B2A;
          border: 3px solid rgba(201,168,76,0.35);
          overflow: hidden;
          flex-shrink: 0;
        }
        .toast-success {
          padding: 0.875rem 1rem;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.2);
          color: #059669;
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 1.25rem;
        }
        .toast-error {
          padding: 0.875rem 1rem;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: #DC2626;
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 1.25rem;
        }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-headline" style={{ color: 'var(--color-navy)', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
          {language === 'en' ? 'Account Settings' : 'অ্যাকাউন্ট সেটিংস'}
        </h1>
        <p style={{ color: 'var(--color-gray-500)', fontSize: '1.05rem', marginTop: '0.25rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
          {language === 'en' ? 'Manage your profile and preferences.' : 'আপনার প্রোফাইল এবং পছন্দগুলি পরিচালনা করুন।'}
        </p>
      </div>

      {/* ── Profile Card ── */}
      <div className="settings-card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '1.5rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
          {language === 'en' ? 'Profile' : 'প্রোফাইল'}
        </h3>

        {profileSuccess && <div className="toast-success">{profileSuccess}</div>}
        {profileError && <div className="toast-error">{profileError}</div>}

        <form onSubmit={handleSaveProfile}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Email — read-only */}
            <div>
              <label className="settings-label" style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                {language === 'en' ? 'Email' : 'ইমেইল'}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  className="settings-input settings-input-readonly"
                  value={profile?.email ?? user?.email ?? ''}
                  readOnly
                />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.35rem 0.75rem', background: 'rgba(16,185,129,0.1)', color: '#059669', borderRadius: '9999px', whiteSpace: 'nowrap' }}>
                  {language === 'en' ? 'Verified' : 'যাচাইকৃত'}
                </span>
              </div>
            </div>

            {/* Display name */}
            <div>
              <label htmlFor="settings-name" className="settings-label" style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                {language === 'en' ? 'Display Name' : 'প্রদর্শনের নাম'}
              </label>
              <input
                id="settings-name"
                className="settings-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={language === 'en' ? 'Your full name' : 'আপনার পুরো নাম'}
                maxLength={100}
                disabled={savingProfile}
                style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}
              />
            </div>

            {/* Address */}
            <div>
              <label htmlFor="settings-address" className="settings-label" style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                {language === 'en' ? 'Address' : 'ঠিকানা'}
              </label>
              <input
                id="settings-address"
                className="settings-input"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder={language === 'en' ? 'e.g. 12 Park Street, Kolkata 700016' : 'যেমন: ১২ পার্ক স্ট্রিট, কলকাতা ৭০০০১৬'}
                maxLength={200}
                disabled={savingProfile}
                style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}
              />
            </div>

            {/* Preferred language */}
            <div>
              <label className="settings-label" style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                {language === 'en' ? 'Preferred Language' : 'পছন্দের ভাষা'}
              </label>
              <div className="lang-radio-group">
                <label className={`lang-radio-label${prefLang === 'en' ? ' selected' : ''}`}>
                  <input type="radio" name="pref-lang" value="en" checked={prefLang === 'en'} onChange={() => setPrefLang('en')} disabled={savingProfile} />
                  🇬🇧 English
                </label>
                <label className={`lang-radio-label${prefLang === 'bn' ? ' selected' : ''}`} style={{ fontFamily: 'var(--font-bangla)' }}>
                  <input type="radio" name="pref-lang" value="bn" checked={prefLang === 'bn'} onChange={() => setPrefLang('bn')} disabled={savingProfile} />
                  🇧🇩 বাংলা
                </label>
              </div>
            </div>

          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={savingProfile}
            style={{ marginTop: '1.75rem', width: '100%', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}
          >
            {savingProfile
              ? (language === 'en' ? 'Saving…' : 'সংরক্ষণ হচ্ছে…')
              : (language === 'en' ? 'Save Changes' : 'পরিবর্তন সংরক্ষণ করুন')}
          </button>
        </form>
      </div>

      {/* ── Avatar Card ── */}
      <div className="settings-card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '1.5rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
          {language === 'en' ? 'Profile Photo' : 'প্রোফাইল ছবি'}
        </h3>

        {avatarSuccess && <div className="toast-success">{avatarSuccess}</div>}
        {avatarError && <div className="toast-error">{avatarError}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div className="avatar-preview">
            {avatarUrl
              ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span>{initials}</span>}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {language === 'en'
                ? 'JPG or PNG, max 2MB. Displayed on your profile and in the navigation bar.'
                : 'JPG অথবা PNG, সর্বোচ্চ ২MB। আপনার প্রোফাইল এবং নেভিগেশন বারে প্রদর্শিত হবে।'}
            </p>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarSelect}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={uploadingAvatar}
              onClick={() => avatarInputRef.current?.click()}
              style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}
            >
              {uploadingAvatar
                ? (language === 'en' ? 'Uploading…' : 'আপলোড হচ্ছে…')
                : avatarUrl
                  ? (language === 'en' ? '📷 Change Photo' : '📷 ছবি পরিবর্তন')
                  : (language === 'en' ? '📷 Upload Photo' : '📷 ছবি আপলোড')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div className="settings-card" style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.02)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#DC2626', marginBottom: '0.5rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
          {language === 'en' ? 'Sign Out' : 'সাইন আউট'}
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1.25rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
          {language === 'en' ? 'You will be signed out of your account on this device.' : 'এই ডিভাইসে আপনার অ্যাকাউন্ট থেকে সাইন আউট করা হবে।'}
        </p>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => logout()}
          style={{ background: 'rgba(239,68,68,0.1)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.25)', fontWeight: 600, fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}
        >
          {language === 'en' ? 'Sign Out' : 'সাইন আউট'}
        </button>
      </div>
    </div>
  );
}
