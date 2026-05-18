'use client';

import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { useLanguage } from '@/contexts/LanguageContext';

const SERVICES = [
  {
    eyebrow: '01',
    title: 'Describe the issue',
    body: 'Write the facts in everyday language, in English or Bengali, without legal jargon.',
  },
  {
    eyebrow: '02',
    title: 'Receive a plain legal map',
    body: 'LegalLink identifies the matter type, relevant law, citations, and next practical steps.',
  },
  {
    eyebrow: '03',
    title: 'Connect with verified advocates',
    body: 'When a human lawyer is needed, you can request help from Bar Council-verified advocates.',
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

export default function LandingPage() {
  const { t, language } = useLanguage();
  const isBangla = language === 'bn';

  return (
    <div className="ll-landing">
      <style>{`
        .ll-landing {
          min-height: 100vh;
          background: #f6f0e6;
          color: #17211c;
          overflow-x: hidden;
        }
        .ll-landing * {
          letter-spacing: 0;
        }
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
        .ll-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 34px;
          align-items: center;
        }
        .ll-btn {
          min-height: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 24px;
          border-radius: 8px;
          font-weight: 800;
          text-decoration: none;
          transition: transform 180ms ease, background 180ms ease, color 180ms ease;
        }
        .ll-btn:hover {
          transform: translateY(-2px);
        }
        .ll-btn-primary {
          background: #17211c;
          color: #fffaf1;
          box-shadow: 0 18px 40px rgba(23,33,28,0.18);
        }
        .ll-btn-primary:hover {
          background: #8f2638;
        }
        .ll-btn-secondary {
          color: #17211c;
          border: 1px solid rgba(23,33,28,0.28);
          background: rgba(255,250,241,0.34);
        }
        .ll-btn-secondary:hover {
          background: rgba(255,250,241,0.76);
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
        .ll-practice-item:nth-child(odd) {
          padding-right: 20px;
        }
        .ll-practice-item:nth-child(even) {
          padding-left: 20px;
        }
        .ll-cta {
          padding: 88px 0;
          background: #8f2638;
          color: #fffaf1;
        }
        .ll-cta-inner {
          display: grid;
          grid-template-columns: 1.2fr auto;
          gap: 32px;
          align-items: center;
        }
        .ll-cta p {
          max-width: 650px;
          color: rgba(255,250,241,0.74);
          margin: 18px 0 0;
          line-height: 1.75;
        }
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
        .ll-footer strong {
          color: #17211c;
        }
        @media (max-width: 980px) {
          .ll-hero {
            min-height: auto;
            padding-top: 56px;
          }
          .ll-hero-grid,
          .ll-band-inner,
          .ll-practice-grid,
          .ll-cta-inner {
            grid-template-columns: 1fr;
          }
          .ll-visual {
            min-height: 520px;
          }
          .ll-portrait {
            inset: 0 0 54px 44px;
          }
          .ll-services-grid {
            grid-template-columns: 1fr;
          }
          .ll-service {
            min-height: 240px;
          }
        }
        @media (max-width: 640px) {
          .ll-shell {
            width: min(100% - 24px, 1180px);
          }
          .ll-hero {
            padding: 44px 0 28px;
          }
          .ll-hero h1 {
            font-size: clamp(3rem, 18vw, 4.6rem);
          }
          .ll-actions,
          .ll-footer-inner {
            align-items: stretch;
            flex-direction: column;
          }
          .ll-btn {
            width: 100%;
          }
          .ll-proof {
            grid-template-columns: 1fr;
            gap: 18px;
          }
          .ll-visual {
            min-height: 430px;
          }
          .ll-portrait {
            inset: 0 0 72px 18px;
          }
          .ll-result-card {
            width: 210px;
            top: 34px;
          }
          .ll-file-stack {
            width: 82%;
          }
          .ll-practice-list {
            grid-template-columns: 1fr;
          }
          .ll-practice-item:nth-child(odd),
          .ll-practice-item:nth-child(even) {
            padding-left: 0;
            padding-right: 0;
          }
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
              <div className="ll-actions">
                <Link href="/intake" className="ll-btn ll-btn-primary">
                  {t('landing.hero.cta')}
                </Link>
                <a href="#how-it-works" className="ll-btn ll-btn-secondary">
                  {t('landing.hero.cta.secondary')}
                </a>
              </div>
              <div className="ll-proof" aria-label="LegalLink highlights">
                {CASE_NOTES.map((note) => (
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
              Start with the facts, get a readable direction, and choose whether to speak with an advocate. The experience is built to feel composed, confidential, and human from the first click.
            </p>
          </div>
        </section>

        <section className="ll-services" id="how-it-works">
          <div className="ll-shell">
            <div className="ll-services-grid">
              {SERVICES.map((service) => (
                <article className="ll-service" key={service.title}>
                  <small>{service.eyebrow}</small>
                  <h3>{service.title}</h3>
                  <p>{service.body}</p>
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
              {PRACTICE_AREAS.map((area) => (
                <div className="ll-practice-item" key={area}>
                  {area}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="ll-cta">
          <div className="ll-shell ll-cta-inner">
            <div>
              <h2 className="ll-section-title">Start with your story.</h2>
              <p>No appointment, no upfront payment, no need to know the name of the law. LegalLink begins with what happened.</p>
            </div>
            <Link href="/intake" className="ll-btn ll-btn-primary" style={{ background: '#fffaf1', color: '#17211c' }}>
              {t('landing.hero.cta')}
            </Link>
          </div>
        </section>
      </main>

      <footer className="ll-footer">
        <div className="ll-shell ll-footer-inner">
          <strong>LegalLink</strong>
          <span>{t('landing.trust.disclaimer')}</span>
        </div>
      </footer>
    </div>
  );
}
