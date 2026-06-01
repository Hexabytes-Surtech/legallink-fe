'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, Sparkles } from 'lucide-react';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import type { MatterDetail } from '@/types';
import { cn } from '@/lib/utils';

// Even one Bengali codepoint flips the query language.
function detectLanguage(text: string): 'en' | 'bn' {
  return /[ঀ-৿]/.test(text) ? 'bn' : 'en';
}

/** Persist a lightweight stub so anonymous users can find their matter again. */
function rememberMatter(m: MatterDetail) {
  try {
    const stubs = JSON.parse(localStorage.getItem('ll_matter_stubs') ?? '[]');
    if (!stubs.find((s: { id: string }) => s.id === m.matterId)) {
      stubs.unshift({
        id: m.matterId,
        queryText: m.query,
        matterType: m.aiResponse?.classification?.matterType,
        status: m.status,
        createdAt: m.createdAt,
      });
      localStorage.setItem('ll_matter_stubs', JSON.stringify(stubs.slice(0, 50)));
    }
    localStorage.setItem('ll_last_matter_id', m.matterId);
  } catch {
    /* ignore */
  }
}

export function MatterIntake({
  variant = 'block',
  className,
  autoFocus,
}: {
  variant?: 'floating' | 'block';
  className?: string;
  autoFocus?: boolean;
}) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const typedBn = detectLanguage(query) === 'bn' || language === 'bn';

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 20) {
      setError(t('intake.error.short'));
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const matter = await api.post<MatterDetail>('/matter', { query: trimmed, language: detectLanguage(trimmed) }, { skipAuth: true });
      rememberMatter(matter);
      router.push(`/matter/${matter.matterId}`);
    } catch (err) {
      setSubmitting(false);
      setError(errorMessage(err) || t('intake.error.generic'));
    }
  }

  const composer = (
    <form onSubmit={submit} className={cn('w-full', variant === 'floating' ? 'glass-strong rounded-2xl p-3 shadow-lift' : 'rounded-2xl border border-border bg-card p-3 shadow-soft')}>
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold">
        <Lock className="size-3" /> {t('landing.chat.pill')}
      </div>
      <div className="flex items-end gap-2">
        <textarea
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (error) setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          rows={variant === 'floating' ? 1 : 3}
          disabled={submitting}
          placeholder={t('intake.placeholder')}
          className={cn(
            'max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground',
            typedBn && 'font-bn',
          )}
        />
        <Button type="submit" disabled={submitting || !query.trim()} size={variant === 'floating' ? 'default' : 'lg'} className="shrink-0">
          {submitting ? (
            <><span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />{t('intake.analyzing.1')}</>
          ) : (
            <><Sparkles className="size-4" />{t('landing.cta.primary')}<ArrowRight className="size-4" /></>
          )}
        </Button>
      </div>
      <div className="mt-1.5 px-2 text-[11px] text-muted-foreground">
        {error ? <span className="font-medium text-destructive">{error}</span> : t('landing.chat.hint')}
      </div>
    </form>
  );

  if (variant === 'floating') {
    return (
      <div className={cn('pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-5 pt-10 bg-gradient-to-t from-background via-background/90 to-transparent', className)}>
        <div className="pointer-events-auto mx-auto w-full max-w-2xl">{composer}</div>
      </div>
    );
  }
  return <div className={className}>{composer}</div>;
}
