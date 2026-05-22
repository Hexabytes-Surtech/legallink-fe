'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { Advocate } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface AdvocateCardProps {
  advocate: Advocate;
  onRequestConsultation: (advocate: Advocate) => void;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', bn: 'বাংলা', hi: 'Hindi',
};

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

export function AdvocateCard({ advocate, onRequestConsultation }: AdvocateCardProps) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  const initials = advocate.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('');

  return (
    <>
      <style>{`
        .advocate-card {
          background: white;
          border-radius: 1.25rem;
          box-shadow: 0 2px 12px rgba(13,27,42,0.08);
          border: 1px solid rgba(13,27,42,0.06);
          overflow: hidden;
          transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
          display: flex;
          flex-direction: column;
        }
        .advocate-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(13,27,42,0.14);
          border-color: rgba(201,168,76,0.3);
        }
        .advocate-card-header {
          background: linear-gradient(135deg, #0D1B2A 0%, #1E3249 100%);
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .advocate-avatar {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 50%;
          background: linear-gradient(135deg, #C9A84C, #E2C475);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 700;
          color: #0D1B2A;
          flex-shrink: 0;
          border: 2px solid rgba(201,168,76,0.4);
        }
        .advocate-name-block { flex: 1; }
        .advocate-name {
          font-size: 1.05rem;
          font-weight: 700;
          color: white;
          line-height: 1.2;
        }
        .advocate-enrolment {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.5);
          margin-top: 2px;
          font-family: monospace;
        }
        .advocate-verified-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(16,185,129,0.15);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 9999px;
          padding: 3px 10px;
          font-size: 0.7rem;
          font-weight: 600;
          color: #10B981;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .advocate-card-body {
          padding: 1.25rem 1.5rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }
        .advocate-info-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .advocate-info-label {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #9CA3AF;
        }
        .advocate-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .advocate-tag {
          display: inline-block;
          padding: 3px 10px;
          background: #F3F4F6;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
          color: #374151;
        }
        .advocate-card-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid #F3F4F6;
          display: flex;
          gap: 0.75rem;
        }
        .advocate-courts {
          font-size: 0.8rem;
          color: #6B7280;
          line-height: 1.4;
        }
      `}</style>
      <div className="advocate-card">
        <div className="advocate-card-header">
          <div className="advocate-avatar">{initials}</div>
          <div className="advocate-name-block">
            <div className="advocate-name">{advocate.name}</div>
            <div className="advocate-enrolment">{advocate.barEnrolmentNumber}</div>
          </div>
          {advocate.verificationStatus === 'verified' && (
            <div className="advocate-verified-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              {t('matter.verified')}
            </div>
          )}
        </div>

        <div className="advocate-card-body">
          <div className="advocate-info-row">
            <div className="advocate-info-label">{t('matter.practiceAreas')}</div>
            <div className="advocate-tags">
              {(advocate.practiceAreas || advocate.practice_areas || []).map(area => (
                <span key={area} className="advocate-tag">
                  {PRACTICE_LABELS[area] ?? area}
                </span>
              ))}
            </div>
          </div>

          <div className="advocate-info-row">
            <div className="advocate-info-label">{t('matter.languages')}</div>
            <div className="advocate-tags">
              {(advocate.languages || []).map(lang => (
                <span key={lang} className="advocate-tag" style={{ background: 'rgba(201,168,76,0.1)', color: '#A0803A' }}>
                  {LANGUAGE_NAMES[lang] ?? lang}
                </span>
              ))}
            </div>
          </div>

          <div className="advocate-info-row">
            <div className="advocate-info-label">{t('matter.districts')}</div>
            <div className="advocate-courts">
              {(advocate.courts || []).join(' · ')}
            </div>
          </div>
        </div>

        <div className="advocate-card-footer">
          <button
            className="btn btn-primary"
            style={{ flex: 1, fontSize: '0.875rem' }}
            onClick={() => onRequestConsultation(advocate)}
          >
            {isAuthenticated ? t('matter.advocates.request') : t('matter.advocates.signin')}
          </button>
        </div>
      </div>
    </>
  );
}