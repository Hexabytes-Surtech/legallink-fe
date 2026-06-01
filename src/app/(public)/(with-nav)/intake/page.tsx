'use client';

import { ShieldCheck, Sparkles, Scale } from 'lucide-react';
import { AuroraBackground } from '@/components/aceternity/aurora-background';
import { Reveal } from '@/components/shared/reveal';
import { MatterIntake } from '@/components/features/matter-intake';
import { useLanguage } from '@/contexts/LanguageContext';

const ASSURANCES = [
  { icon: ShieldCheck, en: 'Anonymous — no account needed', bn: 'বেনামে — অ্যাকাউন্ট লাগে না' },
  { icon: Sparkles, en: 'AI cites real Indian statutes', bn: 'এআই প্রকৃত ভারতীয় আইন উদ্ধৃত করে' },
  { icon: Scale, en: 'Connect with verified advocates', bn: 'যাচাইকৃত আইনজীবীর সাথে যোগাযোগ' },
];

export default function IntakePage() {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <AuroraBackground>
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <Reveal>
          <h1 className={`text-center font-display text-4xl font-semibold tracking-tight sm:text-5xl ${isBn ? 'font-bn' : ''}`}>
            {t('intake.title')}
          </h1>
          <p className={`mx-auto mt-4 max-w-xl text-center text-muted-foreground ${isBn ? 'font-bn' : ''}`}>
            {t('intake.subtitle')}
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="mt-10">
            <MatterIntake variant="block" autoFocus />
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <ul className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-6">
            {ASSURANCES.map((a) => {
              const Icon = a.icon;
              return (
                <li key={a.en} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="size-4 text-gold" />
                  <span className={isBn ? 'font-bn' : ''}>{isBn ? a.bn : a.en}</span>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </AuroraBackground>
  );
}
