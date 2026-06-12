'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Sparkles, BadgeCheck, Languages as LangIcon, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/shared/spinner';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { AuroraBackground } from '@/components/aceternity/aurora-background';
import { Spotlight } from '@/components/aceternity/spotlight';
import { GlowCard } from '@/components/aceternity/glow-card';
import { Reveal } from '@/components/shared/reveal';
import { AiIntakeLauncher } from '@/components/features/ai-intake-launcher';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

const PROOF = [
  { value: '24h', key: 'landing.features.1.title' },
  { value: '2', key: 'landing.stats.languages' },
  { value: '₹0', key: 'landing.features.1.title' },
];

const FEATURES = [
  { icon: ShieldCheck, t: 'landing.features.1.title', d: 'landing.features.1.desc' },
  { icon: Sparkles, t: 'landing.features.2.title', d: 'landing.features.2.desc' },
  { icon: BadgeCheck, t: 'landing.features.3.title', d: 'landing.features.3.desc' },
  { icon: LangIcon, t: 'landing.features.4.title', d: 'landing.features.4.desc' },
] as const;

const PRACTICE = ['Tenancy', 'Family', 'Criminal', 'Labour', 'Consumer', 'Property', 'Traffic', 'Civil'];

const ROLE_HOME: Record<string, string> = {
  citizen: '/dashboard',
  advocate: '/advocate/dashboard',
  admin: '/admin',
};

export default function LandingPage() {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  // The public landing page is the anonymous-citizen entry point (marketing +
  // matter intake). A signed-in user has no business here — send them to the
  // workspace for their role instead of showing them the public CTAs.
  React.useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      router.replace(ROLE_HOME[user.role] ?? '/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  // While the session is restoring, or while we redirect an authed user away,
  // hold the public marketing content back to avoid a flash of the wrong UI.
  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-7" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* ── Hero ───────────────────────────────────────────────── */}
        <AuroraBackground className="relative">
          <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" />
          <section className="mx-auto w-full max-w-5xl px-4 pb-20 pt-1 text-center sm:px-6 sm:pt-24">
            <Reveal>
              <Badge variant="gold" className="mb-2">{t('landing.badge')}</Badge>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className={`font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl ${isBn ? 'font-bn' : ''}`}>
                {t('landing.hero.lead')}
                <br />
                <span className="text-gradient-gold">{t('landing.hero.accent')}</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className={`mx-auto mt-1 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg ${isBn ? 'font-bn' : ''}`}>
                {t('landing.hero.subtitle')}
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mx-auto mt-5 max-w-2xl text-left">
                <AiIntakeLauncher />
              </div>
            </Reveal>

            <Reveal delay={0.25}>
              <dl className="mx-auto mt-12 grid max-w-lg grid-cols-3 gap-6">
                {PROOF.map((p, i) => (
                  <div key={i} className="border-t border-border pt-3 text-left">
                    <dt className="font-display text-3xl font-semibold text-foreground sm:text-4xl">{p.value}</dt>
                    <dd className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                      {i === 0 ? (isBn ? 'বেনামে সেশন' : 'anonymous session') : i === 1 ? t('landing.stats.languages') : (isBn ? 'শুরু করতে খরচ' : 'to begin')}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </section>
        </AuroraBackground>

        {/* ── How it works ───────────────────────────────────────── */}
        <section id="how-it-works" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
          <Reveal>
            <h2 className={`text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl ${isBn ? 'font-bn' : ''}`}>
              {t('landing.features.title')}
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.t} delay={i * 0.08}>
                  <GlowCard className="h-full">
                    <span className="mb-4 grid size-11 place-items-center rounded-xl bg-gold/12 text-gold">
                      <Icon className="size-5" />
                    </span>
                    <h3 className={`font-display text-lg font-semibold ${isBn ? 'font-bn' : ''}`}>{t(f.t)}</h3>
                    <p className={`mt-2 text-sm leading-relaxed text-muted-foreground ${isBn ? 'font-bn' : ''}`}>{t(f.d)}</p>
                  </GlowCard>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ── Practice areas ─────────────────────────────────────── */}
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gold">{t('landing.practice.kicker')}</p>
                <h2 className={`mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl ${isBn ? 'font-bn' : ''}`}>
                  {t('landing.practice.title')}
                </h2>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {PRACTICE.map((p) => (
                  <div key={p} className="rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium transition-colors hover:border-gold/40 hover:text-primary">
                    {p}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Trust band ─────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-6">
          <Reveal>
            <BadgeCheck className="mx-auto size-8 text-gold" />
            <h2 className={`mt-4 font-display text-2xl font-semibold ${isBn ? 'font-bn' : ''}`}>{t('landing.trust.title')}</h2>
            <p className={`mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground ${isBn ? 'font-bn' : ''}`}>
              {t('landing.trust.disclaimer')}
            </p>
            <a href="#how-it-works" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              {t('landing.hero.cta.secondary')} <ArrowRight className="size-4" />
            </a>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
}
