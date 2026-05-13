'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/features/LanguageToggle';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="navbar">
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
        .navbar-logo-text {
          font-size: 1.125rem;
          font-weight: 700;
          color: #FFFFFF;
          letter-spacing: -0.02em;
        }
        .navbar-logo-text span {
          color: #C9A84C;
        }
        .navbar-tagline {
          font-size: 0.65rem;
          font-weight: 500;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-top: -2px;
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
        .mobile-menu {
          display: none;
          background: #162436;
          border-top: 1px solid rgba(201,168,76,0.15);
          padding: 1rem 1.5rem 1.5rem;
          gap: 0.75rem;
          flex-direction: column;
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
          <LanguageToggle variant="navbar" />
        </div>

        <div className="navbar-right desktop-auth">
          {isAuthenticated ? (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <div
                className="user-avatar"
                onClick={() => setDropdownOpen(p => !p)}
                role="button"
                aria-label="User menu"
              >
                {user?.email?.[0]?.toUpperCase() ?? 'U'}
              </div>
              {dropdownOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-email">{user?.email}</div>
                  <Link href="/matters" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>
                    {t('nav.myMatters')}
                  </Link>
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
            <Link href="/matters" className="btn btn-secondary" onClick={() => setMenuOpen(false)}>
              {t('nav.myMatters')}
            </Link>
            <button className="btn btn-ghost" onClick={() => { logout(); setMenuOpen(false); }}>
              {t('nav.signout')}
            </button>
          </>
        ) : (
          <>
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