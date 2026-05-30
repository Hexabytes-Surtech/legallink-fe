'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/features/LanguageToggle';
import { apiClient } from '@/lib/api/client';

interface NavbarProps {
  variant?: 'dark' | 'editorial';
}

export function Navbar({ variant = 'dark' }: NavbarProps) {
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const { t, language } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError(language === 'en' ? 'Image too large (max 5MB)' : 'ছবি খুব বড় (সর্বোচ্চ ৫MB)');
      e.target.value = '';
      return;
    }
    setAvatarError('');
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await apiClient<{ avatar_url: string }>('/user/avatar', { method: 'POST', formData: fd });
      if (res.success && res.data?.avatar_url) {
        updateUser({ avatar_url: res.data.avatar_url });
      } else {
        setAvatarError(res.error ?? 'Upload failed');
      }
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  }

  return (
    <header className={`navbar navbar-${variant}`}>
      <style>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(13,27,42,0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(201,168,76,0.15);
        }
        .navbar-editorial {
          background: rgba(246,240,230,0.92);
          border-bottom: 1px solid rgba(23,33,28,0.12);
        }
        .navbar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.5rem;
          height: 4rem;
          max-width: 1280px;
          margin: 0 auto;
        }
        .navbar-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
        }
        .navbar-logo-icon {
          width: 2rem;
          height: 2rem;
          background: linear-gradient(135deg, #C9A84C 0%, #E2C475 100%);
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          font-weight: 800;
          color: #0D1B2A;
        }
        .navbar-editorial .navbar-logo-icon {
          background: #17211c;
          color: #fffaf1;
          border-radius: 0.25rem;
        }
        .navbar-logo-text {
          font-size: 1.125rem;
          font-weight: 700;
          color: #FFFFFF;
          letter-spacing: -0.02em;
        }
        .navbar-editorial .navbar-logo-text {
          color: #17211c;
          letter-spacing: 0;
        }
        .navbar-logo-text span {
          color: #C9A84C;
        }
        .navbar-editorial .navbar-logo-text span {
          color: #8f2638;
        }
        .navbar-tagline {
          font-size: 0.65rem;
          font-weight: 500;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-top: -2px;
        }
        .navbar-editorial .navbar-tagline {
          color: rgba(23,33,28,0.58);
          letter-spacing: 0;
        }
        .navbar-center {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .navbar-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .user-avatar {
          width: 2.25rem;
          height: 2.25rem;
          border-radius: 9999px;
          background: linear-gradient(135deg, #C9A84C, #E2C475);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 700;
          color: #0D1B2A;
          cursor: pointer;
          border: 2px solid rgba(201,168,76,0.4);
          transition: all 0.2s;
        }
        .user-avatar:hover { border-color: #C9A84C; transform: scale(1.05); }
        .user-dropdown {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          min-width: 180px;
          background: #162436;
          border: 1px solid rgba(201,168,76,0.2);
          border-radius: 0.75rem;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0,0,0,0.4);
          animation: fadeInScale 0.15s ease;
        }
        .user-dropdown-item {
          display: block;
          padding: 0.75rem 1rem;
          color: rgba(255,255,255,0.85);
          font-size: 0.9rem;
          font-weight: 500;
          text-decoration: none;
          transition: background 0.15s;
          cursor: pointer;
          border: none;
          width: 100%;
          text-align: left;
          background: transparent;
        }
        .user-dropdown-item:hover { background: rgba(201,168,76,0.1); color: #C9A84C; }
        .user-dropdown-email {
          padding: 0.75rem 1rem;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.4);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .hamburger {
          display: none;
          flex-direction: column;
          gap: 4px;
          cursor: pointer;
          padding: 0.5rem;
          background: transparent;
          border: none;
        }
        .hamburger span {
          display: block;
          width: 22px;
          height: 2px;
          background: rgba(255,255,255,0.8);
          border-radius: 2px;
          transition: all 0.2s;
        }
        .navbar-editorial .hamburger span {
          background: rgba(23,33,28,0.82);
        }
        .mobile-menu {
          display: none;
          background: #162436;
          border-top: 1px solid rgba(201,168,76,0.15);
          padding: 1rem 1.5rem 1.5rem;
          gap: 0.75rem;
          flex-direction: column;
        }
        .navbar-editorial .mobile-menu {
          background: #f6f0e6;
          border-top: 1px solid rgba(23,33,28,0.12);
        }
        .navbar-editorial .desktop-auth .btn-secondary {
          color: #17211c;
          border-color: rgba(23,33,28,0.32);
        }
        .navbar-editorial .desktop-auth .btn-secondary:hover {
          background: rgba(23,33,28,0.06);
        }
        .navbar-editorial .desktop-auth .btn-primary {
          background: #17211c;
          color: #fffaf1;
          box-shadow: 0 10px 22px rgba(23,33,28,0.16);
        }
        .navbar-editorial .desktop-auth .btn-primary:hover {
          background: #8f2638;
        }
        @media (max-width: 768px) {
          .navbar-center { display: none; }
          .hamburger { display: flex; }
          .mobile-menu.open { display: flex; }
          .desktop-auth { display: none; }
        }
      `}</style>

      <div className="navbar-inner">
        <Link href="/" className="navbar-logo">
          <div className="navbar-logo-icon">L</div>
          <div>
            <div className="navbar-logo-text">Legal<span>Link</span></div>
            <div className="navbar-tagline">{t('nav.tagline')}</div>
          </div>
        </Link>

        <div className="navbar-center">
          <LanguageToggle variant={variant === 'editorial' ? 'page' : 'navbar'} />
        </div>

        <div className="navbar-right desktop-auth">
          {isAuthenticated ? (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarSelect}
              />
              <div
                className="user-avatar"
                onClick={() => setDropdownOpen(p => !p)}
                role="button"
                aria-label="User menu"
                style={{
                  backgroundImage: user?.avatar_url ? `url(${user.avatar_url})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {!user?.avatar_url && (user?.email?.[0]?.toUpperCase() ?? 'U')}
              </div>
              {dropdownOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-email">{user?.email}</div>
                  <button
                    className="user-dropdown-item"
                    onClick={() => { avatarInputRef.current?.click(); setDropdownOpen(false); }}
                    disabled={uploadingAvatar}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <span aria-hidden>📷</span>
                    {uploadingAvatar
                      ? (language === 'en' ? 'Uploading…' : 'আপলোড হচ্ছে…')
                      : user?.avatar_url
                        ? (language === 'en' ? 'Change photo' : 'ছবি পরিবর্তন')
                        : (language === 'en' ? 'Upload photo' : 'ছবি আপলোড')}
                  </button>
                  {avatarError && (
                    <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', color: '#FCA5A5' }}>
                      {avatarError}
                    </div>
                  )}
                  {user?.role === 'advocate' ? (
                    <>
                      <Link href="/advocate/dashboard" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>
                        {language === 'en' ? 'Advocate Dashboard' : 'অ্যাডভোকেট ড্যাশবোর্ড'}
                      </Link>
                      <Link href="/advocate/onboarding" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>
                        {language === 'en' ? 'Onboarding Wizard' : 'অনবোর্ডিং উইজার্ড'}
                      </Link>
                      <Link href="/advocate/profile" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>
                        {language === 'en' ? 'Professional Profile' : 'পেশাগত প্রোফাইল'}
                      </Link>
                      <Link href="/advocate/documents" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>
                        {language === 'en' ? 'Verification Documents' : 'যাচাইকরণ নথিপত্র'}
                      </Link>
                      <Link href="/advocate/availability" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>
                        {language === 'en' ? '📅 My Availability' : '📅 আমার উপলব্ধতা'}
                      </Link>
                    </>
                  ) : user?.role === 'admin' ? (
                    <>
                      <Link href="/admin" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>
                        {language === 'en' ? 'Admin Dashboard' : 'অ্যাডমিন ড্যাশবোর্ড'}
                      </Link>
                      <Link href="/matters" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>
                        {t('nav.myMatters')}
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href="/matters" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>
                        {t('nav.myMatters')}
                      </Link>
                      <Link href="/settings" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>
                        {language === 'en' ? '⚙️ Settings' : '⚙️ সেটিংস'}
                      </Link>
                    </>
                  )}
                  <button
                    className="user-dropdown-item"
                    style={{ color: '#EF4444' }}
                    onClick={() => { logout(); setDropdownOpen(false); }}
                  >
                    {t('nav.signout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/auth/advocate-signup" className="btn btn-ghost btn-sm" style={{ color: '#C9A84C', fontWeight: 600, textDecoration: 'none', marginRight: '0.5rem' }}>
                {language === 'en' ? 'Become an Advocate' : 'অ্যাডভোকেট হিসেবে যোগ দিন'}
              </Link>
              <Link href="/auth/signup" className="btn btn-secondary btn-sm">
                {t('nav.signin')}
              </Link>
              <Link href="/auth/signup" className="btn btn-primary btn-sm">
                {t('nav.signup')}
              </Link>
            </>
          )}
        </div>

        <button
          className="hamburger"
          onClick={() => setMenuOpen(p => !p)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <LanguageToggle variant="mobile" />
        {isAuthenticated ? (
          <>
            {user?.role === 'advocate' ? (
              <>
                <Link href="/advocate/dashboard" className="btn btn-secondary" onClick={() => setMenuOpen(false)}>
                  {language === 'en' ? 'Advocate Dashboard' : 'অ্যাডভোকেট ড্যাশবোর্ড'}
                </Link>
                <Link href="/advocate/onboarding" className="btn btn-ghost" onClick={() => setMenuOpen(false)} style={{ color: 'white', display: 'block', padding: '0.5rem 0', textDecoration: 'none', textAlign: 'center' }}>
                  {language === 'en' ? 'Onboarding Wizard' : 'অনবোর্ডিং উইজার্ড'}
                </Link>
                <Link href="/advocate/profile" className="btn btn-ghost" onClick={() => setMenuOpen(false)} style={{ color: 'white', display: 'block', padding: '0.5rem 0', textDecoration: 'none', textAlign: 'center' }}>
                  {language === 'en' ? 'Professional Profile' : 'পেশাগত প্রোফাইল'}
                </Link>
                <Link href="/advocate/documents" className="btn btn-ghost" onClick={() => setMenuOpen(false)} style={{ color: 'white', display: 'block', padding: '0.5rem 0', textDecoration: 'none', textAlign: 'center' }}>
                  {language === 'en' ? 'Verification Documents' : 'যাচাইকরণ নথিপত্র'}
                </Link>
                <Link href="/advocate/availability" className="btn btn-ghost" onClick={() => setMenuOpen(false)} style={{ color: 'white', display: 'block', padding: '0.5rem 0', textDecoration: 'none', textAlign: 'center' }}>
                  {language === 'en' ? '📅 My Availability' : '📅 আমার উপলব্ধতা'}
                </Link>
              </>
            ) : user?.role === 'admin' ? (
              <>
                <Link href="/admin" className="btn btn-secondary" onClick={() => setMenuOpen(false)}>
                  {language === 'en' ? 'Admin Dashboard' : 'অ্যাডমিন ড্যাশবোর্ড'}
                </Link>
                <Link href="/matters" className="btn btn-ghost" onClick={() => setMenuOpen(false)} style={{ color: 'white', display: 'block', padding: '0.5rem 0', textDecoration: 'none', textAlign: 'center' }}>
                  {t('nav.myMatters')}
                </Link>
              </>
            ) : (
              <>
                <Link href="/matters" className="btn btn-secondary" onClick={() => setMenuOpen(false)}>
                  {t('nav.myMatters')}
                </Link>
                <Link href="/settings" className="btn btn-ghost" onClick={() => setMenuOpen(false)} style={{ color: 'white', display: 'block', padding: '0.5rem 0', textDecoration: 'none', textAlign: 'center' }}>
                  {language === 'en' ? '⚙️ Settings' : '⚙️ সেটিংস'}
                </Link>
              </>
            )}
            <button className="btn btn-ghost" onClick={() => { logout(); setMenuOpen(false); }}>
              {t('nav.signout')}
            </button>
          </>
        ) : (
          <>
            <Link href="/auth/advocate-signup" className="btn btn-secondary" onClick={() => setMenuOpen(false)} style={{ borderColor: '#C9A84C', color: '#C9A84C' }}>
              {language === 'en' ? 'Become an Advocate' : 'অ্যাডভোকেট হিসেবে যোগ দিন'}
            </Link>
            <Link href="/auth/signup" className="btn btn-secondary" onClick={() => setMenuOpen(false)}>
              {t('nav.signin')}
            </Link>
            <Link href="/auth/signup" className="btn btn-primary" onClick={() => setMenuOpen(false)}>
              {t('nav.signup')}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
