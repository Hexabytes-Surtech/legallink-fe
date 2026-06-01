'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/** EN / বাংলা segmented switch wired to LanguageContext. */
export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-muted/50 p-0.5 text-xs font-semibold',
        className,
      )}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        className={cn(
          'rounded-full px-2.5 py-1 transition-colors',
          language === 'en' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('bn')}
        aria-pressed={language === 'bn'}
        className={cn(
          'font-bn rounded-full px-2.5 py-1 transition-colors',
          language === 'bn' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        বাংলা
      </button>
    </div>
  );
}
