'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/i18n/config';

interface LanguageToggleProps {
  variant?: 'navbar' | 'page' | 'mobile';
}

export function LanguageToggle({ variant = 'page' }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <>
      <style>{`
        .lang-toggle {
          display: inline-flex;
          align-items: center;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 9999px;
          padding: 3px;
          gap: 2px;
        }
        .lang-toggle.page-variant {
          background: rgba(13,27,42,0.06);
          border-color: rgba(13,27,42,0.12);
        }
        .lang-btn {
          padding: 0.3rem 0.9rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          color: rgba(255,255,255,0.55);
          background: transparent;
          letter-spacing: 0.01em;
        }
        .lang-toggle.page-variant .lang-btn {
          color: rgba(13,27,42,0.5);
        }
        .lang-btn.active {
          background: #C9A84C;
          color: #0D1B2A;
          box-shadow: 0 2px 8px rgba(201,168,76,0.35);
        }
        .lang-btn:not(.active):hover {
          color: rgba(255,255,255,0.9);
          background: rgba(255,255,255,0.08);
        }
        .lang-toggle.page-variant .lang-btn:not(.active):hover {
          color: #0D1B2A;
          background: rgba(13,27,42,0.06);
        }
        .lang-toggle.mobile-variant {
          width: 100%;
          justify-content: center;
        }
        .lang-toggle.mobile-variant .lang-btn { flex: 1; text-align: center; }
      `}</style>
      <div className={`lang-toggle ${variant === 'page' ? 'page-variant' : ''} ${variant === 'mobile' ? 'mobile-variant' : ''}`}>
        {(['en', 'bn'] as Language[]).map(lang => (
          <button
            key={lang}
            className={`lang-btn ${language === lang ? 'active' : ''}`}
            onClick={() => setLanguage(lang)}
          >
            {lang === 'en' ? 'English' : 'বাংলা'}
          </button>
        ))}
      </div>
    </>
  );
}