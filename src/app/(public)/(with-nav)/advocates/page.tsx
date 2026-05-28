'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { AdvocateCard } from '@/components/features/AdvocateCard';
import { OTPModal } from '@/components/features/OTPModal';
import { apiClient } from '@/lib/api/client';
import { USE_MOCK, mockDelay, MOCK_ADVOCATES } from '@/data/mock';
import type { Advocate, BackendAdvocatesResponse } from '@/types';

// ── Filter constants ──────────────────────────────────────────────────────────

const PRACTICE_AREA_OPTIONS: { value: string; label: string }[] = [
  { value: 'tenancy', label: 'Tenancy' },
  { value: 'property', label: 'Property' },
  { value: 'civil', label: 'Civil' },
  { value: 'criminal', label: 'Criminal' },
  { value: 'family', label: 'Family' },
  { value: 'consumer', label: 'Consumer' },
  { value: 'motor_vehicle', label: 'Motor Vehicle' },
  { value: 'labour', label: 'Labour' },
];

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'bn', label: 'বাংলা' },
  { value: 'hi', label: 'Hindi' },
];

const DISTRICT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Districts' },
  { value: 'kolkata', label: 'Kolkata' },
  { value: 'howrah', label: 'Howrah' },
  { value: 'hooghly', label: 'Hooghly' },
  { value: 'north-24-parganas', label: 'North 24 Parganas' },
  { value: 'south-24-parganas', label: 'South 24 Parganas' },
  { value: 'nadia', label: 'Nadia' },
  { value: 'murshidabad', label: 'Murshidabad' },
  { value: 'burdwan', label: 'Burdwan' },
  { value: 'darjeeling', label: 'Darjeeling' },
  { value: 'malda', label: 'Malda' },
  { value: 'bankura', label: 'Bankura' },
  { value: 'purulia', label: 'Purulia' },
  { value: 'birbhum', label: 'Birbhum' },
  { value: 'midnapore', label: 'Midnapore' },
];

// ── Mock filter helper ────────────────────────────────────────────────────────

function applyMockFilters(
  advocates: Advocate[],
  practiceAreas: string[],
  languages: string[],
  district: string,
  verifiedOnly: boolean,
): Advocate[] {
  return advocates.filter(adv => {
    const areas = adv.practiceAreas ?? adv.practice_areas ?? [];
    const langs = adv.languages ?? [];
    const dists = adv.districts ?? [];
    const status = adv.verificationStatus ?? adv.verification_status;

    if (verifiedOnly && status !== 'verified') return false;
    if (practiceAreas.length && !practiceAreas.some(a => areas.includes(a))) return false;
    if (languages.length && !languages.some(l => langs.includes(l))) return false;
    if (district && !dists.includes(district)) return false;
    return true;
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdvocatesPage() {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Filters
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(true);

  // Results
  const [advocates, setAdvocates] = useState<Advocate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // OTP modal for anonymous consultation request
  const [showOTP, setShowOTP] = useState(false);

  const LIMIT = 9;

  const fetchAdvocates = useCallback(async (currentPage: number) => {
    setLoading(true);
    setError('');
    try {
      if (USE_MOCK) {
        await mockDelay(500);
        const filtered = applyMockFilters(MOCK_ADVOCATES, selectedAreas, selectedLangs, selectedDistrict, verifiedOnly);
        const start = (currentPage - 1) * LIMIT;
        setAdvocates(filtered.slice(start, start + LIMIT));
        setTotal(filtered.length);
        setPages(Math.ceil(filtered.length / LIMIT) || 1);
      } else {
        const params = new URLSearchParams();
        selectedAreas.forEach(a => params.append('practiceArea', a));
        selectedLangs.forEach(l => params.append('language', l));
        if (selectedDistrict) params.set('district', selectedDistrict);
        params.set('verifiedOnly', verifiedOnly ? 'true' : 'false');
        params.set('page', String(currentPage));
        params.set('limit', String(LIMIT));

        const res = await apiClient<BackendAdvocatesResponse>(`/advocates?${params.toString()}`);
        if (res.success && res.data) {
          setAdvocates(res.data.advocates);
          setTotal(res.data.total);
          setPages(res.data.pages);
        } else {
          throw new Error(res.error ?? 'Failed to load advocates');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load advocates.');
    } finally {
      setLoading(false);
    }
  }, [selectedAreas, selectedLangs, selectedDistrict, verifiedOnly]);

  useEffect(() => {
    setPage(1);
    fetchAdvocates(1);
  }, [selectedAreas, selectedLangs, selectedDistrict, verifiedOnly, fetchAdvocates]);

  function toggleArea(val: string) {
    setSelectedAreas(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  }

  function toggleLang(val: string) {
    setSelectedLangs(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  }

  function handlePageChange(p: number) {
    setPage(p);
    fetchAdvocates(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleRequestConsultation(advocate: Advocate) {
    if (!isAuthenticated) {
      setShowOTP(true);
    } else {
      router.push('/intake');
    }
  }

  function clearFilters() {
    setSelectedAreas([]);
    setSelectedLangs([]);
    setSelectedDistrict('');
    setVerifiedOnly(true);
  }

  const hasActiveFilters = selectedAreas.length > 0 || selectedLangs.length > 0 || selectedDistrict !== '' || !verifiedOnly;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream, #F8F6F2)' }}>
      <style>{`
        .dir-hero {
          background: linear-gradient(135deg, #0D1B2A 0%, #1E3249 100%);
          padding: 3rem 1.5rem 2.5rem;
          text-align: center;
        }
        .dir-hero h1 {
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          font-weight: 800;
          color: white;
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
        }
        .dir-hero p {
          font-size: 1.05rem;
          color: rgba(255,255,255,0.65);
          max-width: 520px;
          margin: 0 auto;
        }
        .dir-layout {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1.5rem 4rem;
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 2rem;
          align-items: start;
        }
        @media (max-width: 768px) {
          .dir-layout { grid-template-columns: 1fr; }
          .dir-sidebar { order: -1; }
        }
        .dir-sidebar {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 1.25rem;
          padding: 1.5rem;
          position: sticky;
          top: 5rem;
        }
        .filter-section { margin-bottom: 1.5rem; }
        .filter-section:last-child { margin-bottom: 0; }
        .filter-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #9CA3AF;
          margin-bottom: 0.625rem;
        }
        .chip-group { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .chip {
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 500;
          border: 1.5px solid #E5E7EB;
          background: #FAFAF9;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s;
        }
        .chip:hover { border-color: #C9A84C; }
        .chip.selected {
          background: rgba(201,168,76,0.12);
          border-color: #C9A84C;
          color: var(--color-navy);
          font-weight: 600;
        }
        .dir-select {
          width: 100%;
          padding: 0.6rem 0.85rem;
          border: 1.5px solid #E5E7EB;
          border-radius: 0.625rem;
          font-size: 0.875rem;
          color: #374151;
          background: #FAFAF9;
          outline: none;
          cursor: pointer;
        }
        .dir-select:focus { border-color: #C9A84C; }
        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .toggle-track {
          width: 2.5rem;
          height: 1.375rem;
          border-radius: 9999px;
          background: #E5E7EB;
          position: relative;
          cursor: pointer;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .toggle-track.on { background: #C9A84C; }
        .toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 1rem;
          height: 1rem;
          border-radius: 9999px;
          background: white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          transition: transform 0.2s;
        }
        .toggle-track.on .toggle-thumb { transform: translateX(1.125rem); }
        .dir-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.25rem;
        }
        .skeleton-card {
          height: 320px;
          background: #F3F4F6;
          border-radius: 1.25rem;
          animation: pulse 1.4s ease-in-out infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .pagination-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          margin-top: 2.5rem;
          flex-wrap: wrap;
        }
        .page-btn {
          width: 2.25rem;
          height: 2.25rem;
          border-radius: 0.5rem;
          border: 1.5px solid #E5E7EB;
          background: white;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .page-btn:hover { border-color: #C9A84C; color: #C9A84C; }
        .page-btn.active { background: #0D1B2A; border-color: #0D1B2A; color: white; }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
      `}</style>

      {showOTP && (
        <OTPModal
          onClose={() => setShowOTP(false)}
          onSuccess={() => router.push('/intake')}
          redirectTo="/intake"
        />
      )}

      {/* Hero */}
      <div className="dir-hero">
        <h1 style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
          {language === 'en' ? 'Find a Verified Advocate' : 'একজন যাচাইকৃত আইনজীবী খুঁজুন'}
        </h1>
        <p style={{ fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
          {language === 'en'
            ? 'Browse qualified advocates by practice area, language, and district.'
            : 'অনুশীলন ক্ষেত্র, ভাষা এবং জেলা অনুসারে যোগ্য আইনজীবী খুঁজুন।'}
        </p>
      </div>

      <div className="dir-layout">
        {/* Sidebar */}
        <aside className="dir-sidebar">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-navy)' }}>
              {language === 'en' ? 'Filters' : 'ফিল্টার'}
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                style={{ fontSize: '0.8rem', color: '#C9A84C', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {language === 'en' ? 'Clear all' : 'সব মুছুন'}
              </button>
            )}
          </div>

          {/* Verified only toggle */}
          <div className="filter-section">
            <div className="toggle-row">
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                {language === 'en' ? 'Verified only' : 'শুধু যাচাইকৃত'}
              </span>
              <div
                className={`toggle-track${verifiedOnly ? ' on' : ''}`}
                onClick={() => setVerifiedOnly(p => !p)}
                role="switch"
                aria-checked={verifiedOnly}
              >
                <div className="toggle-thumb" />
              </div>
            </div>
          </div>

          {/* Practice area chips */}
          <div className="filter-section">
            <div className="filter-label">{language === 'en' ? 'Practice Area' : 'অনুশীলন ক্ষেত্র'}</div>
            <div className="chip-group">
              {PRACTICE_AREA_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`chip${selectedAreas.includes(opt.value) ? ' selected' : ''}`}
                  onClick={() => toggleArea(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language chips */}
          <div className="filter-section">
            <div className="filter-label">{language === 'en' ? 'Language' : 'ভাষা'}</div>
            <div className="chip-group">
              {LANGUAGE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`chip${selectedLangs.includes(opt.value) ? ' selected' : ''}`}
                  onClick={() => toggleLang(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* District dropdown */}
          <div className="filter-section">
            <div className="filter-label">{language === 'en' ? 'District' : 'জেলা'}</div>
            <select
              className="dir-select"
              value={selectedDistrict}
              onChange={e => setSelectedDistrict(e.target.value)}
            >
              {DISTRICT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </aside>

        {/* Main content */}
        <div>
          {/* Results header */}
          <div className="results-header">
            <span style={{ fontSize: '0.9375rem', color: '#6B7280', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {loading ? '' : language === 'en'
                ? `${total} advocate${total !== 1 ? 's' : ''} found`
                : `${total} জন আইনজীবী পাওয়া গেছে`}
            </span>
          </div>

          {error && (
            <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: 600 }}>
              {error}
            </div>
          )}

          {/* Skeleton loading */}
          {loading && (
            <div className="dir-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton-card" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && advocates.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              background: 'white',
              borderRadius: '1.25rem',
              border: '1px dashed #E5E7EB',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.5rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                {language === 'en' ? 'No advocates match these filters' : 'এই ফিল্টারের সাথে কোনো আইনজীবী মেলেনি'}
              </h3>
              <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '1.25rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
                {language === 'en' ? 'Try adjusting your filters.' : 'আপনার ফিল্টার পরিবর্তন করে দেখুন।'}
              </p>
              <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                {language === 'en' ? 'Clear filters' : 'ফিল্টার মুছুন'}
              </button>
            </div>
          )}

          {/* Advocate grid */}
          {!loading && advocates.length > 0 && (
            <div className="dir-grid">
              {advocates.map(adv => (
                <AdvocateCard
                  key={adv.id ?? adv.advocate_id}
                  advocate={adv}
                  onRequestConsultation={handleRequestConsultation}
                  showViewProfile
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && pages > 1 && (
            <div className="pagination-row">
              <button
                className="page-btn"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                ‹
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`page-btn${p === page ? ' active' : ''}`}
                  onClick={() => handlePageChange(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="page-btn"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= pages}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
