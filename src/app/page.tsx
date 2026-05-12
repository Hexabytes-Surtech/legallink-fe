'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navbar } from '@/components/Navbar';

const FEATURES = [
  {
    icon: '🔒',
    titleKey: 'landing.features.1.title' as const,
    descKey: 'landing.features.1.desc' as const,
  },
  {
    icon: '⚖️',
    titleKey: 'landing.features.2.title' as const,
    descKey: 'landing.features.2.desc' as const,
  },
  {
    icon: '🎓',
    titleKey: 'landing.features.3.title' as const,
    descKey: 'landing.features.3.desc' as const,
  },
  {
    icon: '🌐',
    titleKey: 'landing.features.4.title' as const,
    descKey: 'landing.features.4.desc' as const,
  },
];

const STATS = [
  { value: '2,400+', labelKey: 'landing.stats.matters' as const },
  { value: '180+',   labelKey: 'landing.stats.advocates' as const },
  { value: '2',      labelKey: 'landing.stats.languages' as const },
];

export default function LandingPage() {
  const { t, language } = useLanguage();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-cream)' }}>
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #0D1B2A 0%, #162436 40%, #1a2f47 100%)',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '90vh',
        display: 'flex',
        alignItems: 'center',
      }}>
        {/* Decorative orbs */}
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%',
          width: '50vw', height: '50vw', maxWidth: '600px', maxHeight: '600px',
          background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', left: '-10%',
          width: '40vw', height: '40vw', maxWidth: '500px', maxHeight: '500px',
          background: 'radial-gradient(circle, rgba(30,50,73,0.8) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />

        {/* Grid pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 1, padding: '5rem 1.5rem' }}>
          <div style={{ maxWidth: '800px' }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.25)',
              borderRadius: '9999px',
              padding: '0.4rem 1rem',
              marginBottom: '2rem',
              animation: 'fadeIn 0.6s ease',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C', display: 'inline-block' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#C9A84C', letterSpacing: '0.04em' }}>
                West Bengal Legal Aid Initiative
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-display" style={{
              color: 'white',
              marginBottom: '1.5rem',
              animation: 'fadeIn 0.7s ease 0.1s both',
              whiteSpace: 'pre-line',
              fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
            }}>
              {t('landing.hero.title')}
            </h1>

            {/* Subtitle */}
            <p className="text-body-lg" style={{
              color: 'rgba(255,255,255,0.65)',
              maxWidth: '560px',
              marginBottom: '2.5rem',
              animation: 'fadeIn 0.7s ease 0.2s both',
              fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
            }}>
              {t('landing.hero.subtitle')}
            </p>

            {/* CTAs */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              animation: 'fadeIn 0.7s ease 0.3s both',
            }}>
              <Link
                href="/app/intake"
                id="hero-cta-primary"
                className="btn btn-primary btn-lg"
                style={{ gap: '0.625rem' }}
              >
                {t('landing.hero.cta')}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <a
                href="#how-it-works"
                className="btn btn-secondary btn-lg"
              >
                {t('landing.hero.cta.secondary')}
              </a>
            </div>

            {/* Stats */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '2.5rem',
              marginTop: '4rem',
              animation: 'fadeIn 0.7s ease 0.45s both',
            }}>
              {STATS.map(stat => (
                <div key={stat.labelKey}>
                  <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#C9A84C', lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', marginTop: '4px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {t(stat.labelKey)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '6rem 0', background: 'white' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div className="badge badge-gold" style={{ marginBottom: '1rem' }}>Process</div>
            <h2 className="text-headline" style={{ color: 'var(--color-navy)', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
              {t('landing.features.title')}
            </h2>
            <div className="divider-gold" style={{ maxWidth: '60px', margin: '1.25rem auto 0' }} />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem',
          }}>
            {FEATURES.map((f, i) => (
              <div
                key={f.titleKey}
                className="card card-hover"
                style={{
                  padding: '2rem',
                  animation: `slideInUp 0.5s ease ${i * 0.1}s both`,
                  borderTop: '3px solid #C9A84C',
                }}
              >
                <div style={{
                  width: '3.25rem', height: '3.25rem',
                  background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.06))',
                  borderRadius: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginBottom: '1.25rem',
                }}>
                  {f.icon}
                </div>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: 'var(--color-navy)',
                  marginBottom: '0.625rem',
                  fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
                }}>
                  {t(f.titleKey)}
                </h3>
                <p style={{
                  color: 'var(--color-gray-500)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.6,
                  fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
                }}>
                  {t(f.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #0D1B2A 0%, #1E3249 100%)',
        padding: '5rem 0',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(circle at 80% 50%, rgba(201,168,76,0.08) 0%, transparent 60%)`,
          pointerEvents: 'none',
        }} />
        <div className="container" style={{ textAlign: 'center', position: 'relative' }}>
          <h2 className="text-headline" style={{
            color: 'white',
            marginBottom: '1rem',
            fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
          }}>
            {language === 'en'
              ? 'Your rights matter. Get help now.'
              : 'আপনার অধিকার গুরুত্বপূর্ণ। এখনই সাহায্য নিন।'}
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '1.125rem',
            marginBottom: '2.5rem',
            maxWidth: '500px',
            margin: '0 auto 2.5rem',
            fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
          }}>
            {language === 'en'
              ? 'No fees. No registration needed. Just describe your problem.'
              : 'কোনো ফি নেই। কোনো নিবন্ধন দরকার নেই। শুধু আপনার সমস্যা বলুন।'}
          </p>
          <Link href="/app/intake" id="cta-bottom" className="btn btn-primary btn-lg">
            {t('landing.hero.cta')}
          </Link>
        </div>
      </section>

      {/* ── Disclaimer ───────────────────────────────────────────── */}
      <footer style={{
        background: 'white',
        borderTop: '1px solid var(--color-gray-100)',
        padding: '2rem 0',
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.875rem',
          }}>
            <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-navy)', letterSpacing: '-0.02em' }}>
              Legal<span style={{ color: '#C9A84C' }}>Link</span>
            </span>
          </div>
          <p style={{
            fontSize: '0.8rem',
            color: 'var(--color-gray-400)',
            maxWidth: '640px',
            margin: '0 auto',
            lineHeight: 1.6,
            fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit',
          }}>
            {t('landing.trust.disclaimer')}
          </p>
        </div>
      </footer>
    </div>
  );
}
