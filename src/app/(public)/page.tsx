'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiClient } from '@/lib/api/client';
import type { BackendMatterResponse, MatterStub } from '@/types';

const SERVICES = [
  {
    eyebrow: '01',
    titleEn: 'Describe the issue',
    titleBn: 'সমস্যাটি বর্ণনা করুন',
    bodyEn: 'Write the facts in everyday language, in English or Bengali, without legal jargon.',
    bodyBn: 'সহজ ভাষায় ঘটনাটি লিখুন, বাংলা বা ইংরেজিতে — কোনো আইনি পরিভাষা দরকার নেই।',
  },
  {
    eyebrow: '02',
    titleEn: 'Receive a plain legal map',
    titleBn: 'সরল আইনি বিশ্লেষণ পান',
    bodyEn: 'LegalLink identifies the matter type, relevant law, citations, and next practical steps.',
    bodyBn: 'লিগ্যাললিংক বিষয়ের ধরন, প্রাসঙ্গিক আইন, উদ্ধৃতি ও পরবর্তী পদক্ষেপ চিহ্নিত করে।',
  },
  {
    eyebrow: '03',
    titleEn: 'Connect with verified advocates',
    titleBn: 'যাচাইকৃত আইনজীবীর সাথে যোগাযোগ',
    bodyEn: 'When a human lawyer is needed, you can request help from Bar Council-verified advocates.',
    bodyBn: 'প্রয়োজন হলে বার কাউন্সিল যাচাইকৃত আইনজীবীর কাছে পরামর্শ চাইতে পারেন।',
  },
];

const PRACTICE_AREAS = [
  'Tenant and housing disputes',
  'Employment and wages',
  'Family protection',
  'Consumer complaints',
  'Property documentation',
  'Police and civic issues',
];

const CASE_NOTES = [
  { value: '24h', label: 'anonymous session window' },
  { value: '2', label: 'supported languages' },
  { value: '0', label: 'fees to begin' },
];

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'LegalLink',
  description:
    'AI-powered legal aid platform for citizens of West Bengal. Free, anonymous, bilingual legal guidance with real statute citations and verified advocates.',
  url: 'https://legallink.in',
  applicationCategory: 'LegalService',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  inLanguage: ['en', 'bn'],
  areaServed: { '@type': 'AdministrativeArea', name: 'West Bengal, India' },
};

// Heuristic Bengali detection — even one Bengali character flips the language.
function detectLanguage(text: string): 'en' | 'bn' {
  return /[ঀ-৿]/.test(text) ? 'bn' : 'en';
}

function rememberMatter(matter: BackendMatterResponse) {
  try {
    const stubs: MatterStub[] = JSON.parse(localStorage.getItem('ll_matter_stubs') ?? '[]');
    if (!stubs.find(s => s.id === matter.matterId)) {
      stubs.unshift({
        id: matter.matterId,
        queryText: matter.query,
        matterType: matter.aiResponse?.classification?.matterType ?? undefined,
        status: matter.status || 'pending',
        createdAt: matter.createdAt,
      });
      localStorage.setItem('ll_matter_stubs', JSON.stringify(stubs.slice(0, 50)));
    }
    // Track the latest anonymous matter so the user can find their way back
    localStorage.setItem('ll_last_matter_id', matter.matterId);
  } catch {
    /* ignore */
  }
}

export default function LandingPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const isBangla = language === 'bn';

  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = query.trim();
      if (trimmed.length < 20) {
        setError(t('intake.error.short'));
        return;
      }
      setError('');
      setSubmitting(true);
      const detected = detectLanguage(trimmed);
      const res = await apiClient<BackendMatterResponse>('/matter', {
        method: 'POST',
        body: { query: trimmed, language: detected },
        skipAuth: true,
      });
      if (res.success && res.data) {
        rememberMatter(res.data);
        router.push(`/matter/${res.data.matterId}`);
      } else {
        setSubmitting(false);
        setError(res.error ?? t('intake.error.generic'));
      }
    },
    [query, router, t]
  );

  return (
    <div className="ll-landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <style>{`
        .ll-landing {
          min-height: 100vh;
          background: #f6f0e6;
          color: #17211c;
          overflow-x: hidden;
          padding-bottom: 220px;
        }
        .ll-landing * { letter-spacing: 0; }
        .ll-shell {
          width: min(1180px, calc(100% - 32px));
          margin: 0 auto;
        }
        .ll-hero {
          position: relative;
          min-height: calc(100vh - 64px);
          display: flex;
          align-items: center;
          padding: 72px 0 44px;
          background:
            linear-gradient(90deg, rgba(246,240,230,0.92) 0%, rgba(246,240,230,0.84) 46%, rgba(246,240,230,0.22) 100%),
            linear-gradient(135deg, #f6f0e6 0%, #efe2cd 52%, #284235 100%);
        }
        .ll-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(120deg, rgba(23,33,28,0.08) 0 1px, transparent 1px 100%),
            linear-gradient(90deg, rgba(146,108,52,0.08) 0 1px, transparent 1px 100%);
          background-size: 100% 120px, 120px 100%;
          pointer-events: none;
        }
        .ll-hero-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1.02fr) minmax(360px, 0.98fr);
          gap: 56px;
          align-items: center;
        }
        .ll-kicker {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #7d5b24;
          font-size: 0.78rem;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 24px;
        }
        .ll-kicker::before {
          content: "";
          width: 42px;
          height: 1px;
          background: #9d7331;
        }
        .ll-hero h1 {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(3.2rem, 8vw, 7.8rem);
          line-height: 0.92;
          font-weight: 500;
          max-width: 780px;
          margin: 0;
        }
        .ll-hero h1 span {
          display: block;
          color: #8f2638;
        }
        .ll-lede {
          max-width: 610px;
          margin: 28px 0 0;
          color: #4d5b53;
          font-size: clamp(1rem, 1.7vw, 1.18rem);
          line-height: 1.75;
        }
        .ll-proof {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 54px;
          max-width: 640px;
        }
        .ll-proof-item {
          border-top: 1px solid rgba(23,33,28,0.26);
          padding-top: 14px;
        }
        .ll-proof-item strong {
          display: block;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 500;
          line-height: 1;
          color: #284235;
        }
        .ll-proof-item span {
          display: block;
          margin-top: 8px;
          color: #65736a;
          font-size: 0.82rem;
          line-height: 1.45;
          text-transform: uppercase;
        }
        .ll-visual {
          min-height: 620px;
          position: relative;
          isolation: isolate;
        }
        .ll-portrait {
          position: absolute;
          inset: 0 0 54px 70px;
          border-radius: 8px;
          background:
            linear-gradient(180deg, rgba(255,250,241,0.08), rgba(255,250,241,0.22)),
            radial-gradient(circle at 50% 24%, rgba(255,246,228,0.95) 0 8%, transparent 8.5%),
            linear-gradient(110deg, transparent 0 37%, #1d2d25 37% 52%, transparent 52% 100%),
            linear-gradient(180deg, #314f40 0%, #17211c 100%);
          box-shadow: 0 34px 80px rgba(23,33,28,0.28);
          overflow: hidden;
        }
        .ll-portrait::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 26%;
          width: 34%;
          height: 52%;
          transform: translateX(-50%);
          border-radius: 52% 52% 8px 8px;
          background:
            linear-gradient(90deg, rgba(143,38,56,0.8), rgba(238,226,205,0.16) 44%, rgba(23,33,28,0.65)),
            #223a30;
        }
        .ll-portrait::after {
          content: "";
          position: absolute;
          inset: auto 0 0;
          height: 32%;
          background:
            linear-gradient(90deg, rgba(246,240,230,0.08), transparent 28%, rgba(246,240,230,0.12)),
            repeating-linear-gradient(90deg, rgba(255,250,241,0.18) 0 1px, transparent 1px 64px);
        }
        .ll-file-stack {
          position: absolute;
          left: 0;
          bottom: 0;
          width: min(360px, 72%);
          border-radius: 8px;
          background: #fffaf1;
          box-shadow: 0 24px 60px rgba(23,33,28,0.2);
          padding: 24px;
          z-index: 2;
        }
        .ll-file-head {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          color: #8f2638;
          font-size: 0.74rem;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 22px;
        }
        .ll-file-line {
          height: 10px;
          border-radius: 999px;
          background: #d9cab4;
          margin-top: 12px;
        }
        .ll-file-line:nth-child(3) { width: 74%; }
        .ll-file-line:nth-child(4) { width: 88%; }
        .ll-file-line:nth-child(5) { width: 54%; }
        .ll-result-card {
          position: absolute;
          right: -2px;
          top: 78px;
          z-index: 3;
          width: min(290px, 58%);
          border-radius: 8px;
          background: #8f2638;
          color: #fffaf1;
          padding: 22px;
          box-shadow: 0 20px 58px rgba(71,18,29,0.28);
        }
        .ll-result-card small {
          display: block;
          color: rgba(255,250,241,0.66);
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .ll-result-card strong {
          display: block;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 2rem;
          font-weight: 500;
          line-height: 1;
        }
        .ll-band {
          background: #17211c;
          color: #fffaf1;
          padding: 54px 0;
        }
        .ll-band-inner {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 42px;
          align-items: start;
        }
        .ll-section-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(2.35rem, 5vw, 5.2rem);
          line-height: 0.98;
          font-weight: 500;
          margin: 0;
        }
        .ll-section-copy {
          color: rgba(255,250,241,0.66);
          font-size: 1.04rem;
          line-height: 1.75;
          max-width: 560px;
        }
        .ll-services {
          padding: 84px 0;
          background: #fffaf1;
        }
        .ll-services-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          border-top: 1px solid rgba(23,33,28,0.16);
          border-left: 1px solid rgba(23,33,28,0.16);
        }
        .ll-service {
          min-height: 300px;
          padding: 30px;
          border-right: 1px solid rgba(23,33,28,0.16);
          border-bottom: 1px solid rgba(23,33,28,0.16);
          background: #fffaf1;
        }
        .ll-service small {
          color: #9d7331;
          font-weight: 900;
        }
        .ll-service h3 {
          margin: 52px 0 16px;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(1.7rem, 3vw, 2.35rem);
          line-height: 1.05;
          font-weight: 500;
        }
        .ll-service p {
          color: #647168;
          line-height: 1.7;
          margin: 0;
        }
        .ll-practice {
          padding: 86px 0;
          background: #f6f0e6;
        }
        .ll-practice-grid {
          display: grid;
          grid-template-columns: 0.82fr 1.18fr;
          gap: 58px;
          align-items: start;
        }
        .ll-practice-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          border-top: 1px solid rgba(23,33,28,0.18);
        }
        .ll-practice-item {
          min-height: 96px;
          display: flex;
          align-items: center;
          padding: 20px 0;
          border-bottom: 1px solid rgba(23,33,28,0.18);
          color: #22342c;
          font-size: clamp(1.02rem, 1.7vw, 1.26rem);
          font-weight: 700;
        }
        .ll-practice-item:nth-child(odd) { padding-right: 20px; }
        .ll-practice-item:nth-child(even) { padding-left: 20px; }
        .ll-footer {
          background: #fffaf1;
          border-top: 1px solid rgba(23,33,28,0.14);
          padding: 28px 0;
          color: #69766e;
          font-size: 0.86rem;
        }
        .ll-footer-inner {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: center;
        }
        .ll-footer strong { color: #17211c; }

        /* ----------- Floating chat widget ----------- */
        .ll-chatbar {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 60;
          padding: 14px 16px 20px;
          background: linear-gradient(180deg, rgba(246,240,230,0) 0%, rgba(246,240,230,0.96) 38%, #f6f0e6 100%);
          pointer-events: none;
        }
        .ll-chatbar-inner {
          pointer-events: auto;
          width: min(820px, calc(100% - 16px));
          margin: 0 auto;
          background: #fffaf1;
          border: 1px solid rgba(23,33,28,0.12);
          border-radius: 22px;
          box-shadow: 0 24px 60px -16px rgba(23,33,28,0.30),
                      0 6px 16px -4px rgba(23,33,28,0.10);
          padding: 14px 14px 14px 18px;
        }
        .ll-chatbar-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px;
          background: rgba(40, 66, 53, 0.08);
          border: 1px solid rgba(40, 66, 53, 0.18);
          color: #284235;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .ll-chatbar-pill::before {
          content: "🔒";
          font-size: 0.85rem;
        }
        .ll-chatbar-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }
        .ll-chatbar-textarea {
          flex: 1;
          border: none;
          outline: none;
          resize: none;
          background: transparent;
          color: #17211c;
          font-family: inherit;
          font-size: 1rem;
          line-height: 1.55;
          min-height: 44px;
          max-height: 140px;
          padding: 6px 0;
        }
        .ll-chatbar-textarea::placeholder { color: rgba(23,33,28,0.42); }
        .ll-chatbar-send {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 18px;
          background: #17211c;
          color: #fffaf1;
          border: none;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: background 180ms ease, transform 180ms ease;
        }
        .ll-chatbar-send:hover:not(:disabled) {
          background: #8f2638;
          transform: translateY(-1px);
        }
        .ll-chatbar-send:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .ll-chatbar-error {
          margin-top: 8px;
          color: #8f2638;
          font-size: 0.82rem;
          font-weight: 600;
        }
        .ll-chatbar-hint {
          margin-top: 8px;
          color: rgba(23,33,28,0.52);
          font-size: 0.74rem;
          letter-spacing: 0.02em;
        }
        .ll-chatbar-spinner {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid rgba(255,250,241,0.4);
          border-top-color: #fffaf1;
          animation: ll-spin 0.8s linear infinite;
        }
        @keyframes ll-spin { to { transform: rotate(360deg); } }

        @media (max-width: 980px) {
          .ll-hero { min-height: auto; padding-top: 56px; }
          .ll-hero-grid, .ll-band-inner, .ll-practice-grid { grid-template-columns: 1fr; }
          .ll-visual { min-height: 520px; }
          .ll-portrait { inset: 0 0 54px 44px; }
          .ll-services-grid { grid-template-columns: 1fr; }
          .ll-service { min-height: 240px; }
        }
        @media (max-width: 640px) {
          .ll-shell { width: min(100% - 24px, 1180px); }
          .ll-hero { padding: 44px 0 28px; }
          .ll-hero h1 { font-size: clamp(3rem, 18vw, 4.6rem); }
          .ll-footer-inner { align-items: stretch; flex-direction: column; }
          .ll-proof { grid-template-columns: 1fr; gap: 18px; }
          .ll-visual { min-height: 430px; }
          .ll-portrait { inset: 0 0 72px 18px; }
          .ll-result-card { width: 210px; top: 34px; }
          .ll-file-stack { width: 82%; }
          .ll-practice-list { grid-template-columns: 1fr; }
          .ll-practice-item:nth-child(odd),
          .ll-practice-item:nth-child(even) { padding-left: 0; padding-right: 0; }
          .ll-chatbar-row { flex-direction: column; align-items: stretch; }
          .ll-chatbar-send { justify-content: center; }
        }
      `}</style>

      <Navbar variant="editorial" />

      <main>
        <section className="ll-hero">
          <div className="ll-shell ll-hero-grid">
            <div>
              <div className="ll-kicker">West Bengal Legal Aid</div>
              <h1 style={{ fontFamily: isBangla ? 'var(--font-bangla)' : undefined }}>
                Legal help,
                <span>made legible.</span>
              </h1>
              <p className="ll-lede" style={{ fontFamily: isBangla ? 'var(--font-bangla)' : undefined }}>
                {t('landing.hero.subtitle')}
              </p>
              <div className="ll-proof" aria-label="LegalLink highlights">
                {CASE_NOTES.map(note => (
                  <div className="ll-proof-item" key={note.label}>
                    <strong>{note.value}</strong>
                    <span>{note.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ll-visual" aria-hidden="true">
              <div className="ll-portrait" />
              <div className="ll-result-card">
                <small>AI matter map</small>
                <strong>Tenant rights</strong>
              </div>
              <div className="ll-file-stack">
                <div className="ll-file-head">
                  <span>LegalLink</span>
                  <span>Case brief</span>
                </div>
                <div className="ll-file-line" />
                <div className="ll-file-line" />
                <div className="ll-file-line" />
                <div className="ll-file-line" />
              </div>
            </div>
          </div>
        </section>

        <section className="ll-band">
          <div className="ll-shell ll-band-inner">
            <h2 className="ll-section-title">Calm guidance when the law feels impossible.</h2>
            <p className="ll-section-copy">
              Start with the facts, get a readable direction, and choose whether to speak with an advocate.
              The experience is built to feel composed, confidential, and human from the first click.
            </p>
          </div>
        </section>

        <section className="ll-services" id="how-it-works">
          <div className="ll-shell">
            <div className="ll-services-grid">
              {SERVICES.map(service => (
                <article className="ll-service" key={service.eyebrow}>
                  <small>{service.eyebrow}</small>
                  <h3 style={{ fontFamily: isBangla ? 'var(--font-bangla)' : undefined }}>
                    {isBangla ? service.titleBn : service.titleEn}
                  </h3>
                  <p style={{ fontFamily: isBangla ? 'var(--font-bangla)' : undefined }}>
                    {isBangla ? service.bodyBn : service.bodyEn}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ll-practice">
          <div className="ll-shell ll-practice-grid">
            <div>
              <div className="ll-kicker">Common matters</div>
              <h2 className="ll-section-title">Built for everyday legal problems.</h2>
            </div>
            <div className="ll-practice-list">
              {PRACTICE_AREAS.map(area => (
                <div className="ll-practice-item" key={area}>
                  {area}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="ll-footer">
        <div className="ll-shell ll-footer-inner">
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            <strong>LegalLink</strong>
          </Link>
          <span>{t('landing.trust.disclaimer')}</span>
        </div>
      </footer>

      {/* Floating chat input widget (master plan §5.1) */}
      <div className="ll-chatbar" role="region" aria-label="Describe your legal problem">
        <div className="ll-chatbar-inner">
          <span className="ll-chatbar-pill">
            {language === 'en'
              ? 'Private · No sign-up needed · Responses in seconds'
              : 'গোপনীয় · সাইন-আপ ছাড়াই · কয়েক সেকেন্ডেই উত্তর'}
          </span>
          <form onSubmit={handleSubmit} className="ll-chatbar-row">
            <textarea
              className="ll-chatbar-textarea"
              placeholder={
                language === 'en'
                  ? 'Describe your legal problem in Bengali or English…'
                  : 'বাংলা বা ইংরেজিতে আপনার আইনি সমস্যা বলুন…'
              }
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={1}
              style={{
                fontFamily:
                  detectLanguage(query) === 'bn' || isBangla ? 'var(--font-bangla)' : undefined,
              }}
              disabled={submitting}
            />
            <button type="submit" className="ll-chatbar-send" disabled={submitting || !query.trim()}>
              {submitting ? (
                <>
                  <span className="ll-chatbar-spinner" />
                  {language === 'en' ? 'Analysing…' : 'বিশ্লেষণ হচ্ছে…'}
                </>
              ) : (
                <>
                  {language === 'en' ? 'Get free analysis' : 'বিনামূল্যে বিশ্লেষণ'}
                  <span aria-hidden>→</span>
                </>
              )}
            </button>
          </form>
          {error ? (
            <div className="ll-chatbar-error" role="alert">
              {error}
            </div>
          ) : (
            <div className="ll-chatbar-hint">
              {language === 'en'
                ? 'Press Enter to send · Shift + Enter for a new line'
                : 'পাঠাতে Enter চাপুন · নতুন লাইনের জন্য Shift + Enter'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
