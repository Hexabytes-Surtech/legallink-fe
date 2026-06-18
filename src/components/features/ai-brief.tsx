'use client';

import { AlertTriangle, BookOpen, ListChecks, Footprints, Sparkles, MapPin, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CitationChip } from './citation-chip';
import { displayPracticeArea } from '@/lib/practice-areas';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations, type TranslationKey } from '@/i18n/config';
import type { MatterDetail, Classification } from '@/types';
import { cn } from '@/lib/utils';
import { Markdown, MarkdownInline } from '@/lib/markdown';

// tiny local translator to avoid prop-drilling `t`
function tr(key: TranslationKey, isBn: boolean): string {
  const dict = (isBn ? translations.bn : translations.en) as Record<string, string>;
  return dict[key] ?? (translations.en as Record<string, string>)[key] ?? key;
}

// ── normalisers for the backend quirks (§8 of the integration guide) ──────────
function locationText(loc: Classification['location']): string | null {
  if (!loc) return null;
  if (typeof loc === 'string') return loc;
  return [loc.district, loc.state].filter(Boolean).join(', ') || null;
}
function statuteText(c: Classification | null): string | null {
  if (!c) return null;
  if (c.statute) return c.statute;
  const law = c.applicableLaws?.[0];
  return law ? [law.act, law.sections?.join(', ')].filter(Boolean).join(' ') : null;
}
function toList(s: string | null): string[] {
  if (!s) return [];
  return s.split('\n').map((x) => x.replace(/^[-•\d.\s]+/, '').trim()).filter(Boolean);
}

export function AiBrief({ matter }: { matter: MatterDetail }) {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const ai = matter.aiResponse;

  // Processing / failed states ------------------------------------------------
  if (!ai) {
    const failed = matter.status === 'ai_failed';
    return (
      <Card className={cn(failed && 'border-destructive/40')}>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          {failed ? (
            <>
              <span className="grid size-12 place-items-center rounded-full bg-destructive/12 text-destructive">
                <AlertTriangle className="size-6" />
              </span>
              <p className="font-display text-lg font-semibold">{tr('brief.failed', isBn)}</p>
            </>
          ) : (
            <>
              <span className="grid size-12 place-items-center rounded-full bg-gold/12 text-gold animate-pulse-glow">
                <Sparkles className="size-6" />
              </span>
              <p className="font-display text-lg font-semibold">{tr('brief.processing', isBn)}</p>
              <p className="max-w-sm text-sm text-muted-foreground">{tr('brief.processingHint', isBn)}</p>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const c = ai.classification;
  const loc = locationText(c?.location);
  const statute = statuteText(c);
  const procedural = toList(ai.procedural);
  const nextSteps = toList(ai.nextSteps);
  const hasEn = !!ai.responseEnglish;
  const hasBn = !!ai.responseBengali;

  // No in-card language switcher: render in the app's active language, falling
  // back to whichever translation the backend produced.
  let analysis: string | null;
  let analysisBn: boolean;
  if (isBn && hasBn) { analysis = ai.responseBengali; analysisBn = true; }
  else if (hasEn) { analysis = ai.responseEnglish; analysisBn = false; }
  else { analysis = ai.responseBengali; analysisBn = hasBn; }

  return (
    <div className="space-y-5">
      {/* Classification */}
      {c && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5 text-base">
              <span className="grid size-8 place-items-center rounded-lg bg-gold/12 text-gold"><Scale className="size-4" /></span>
              {tr('matter.classification', isBn)}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(() => {
              // Normalise BOTH before comparing/rendering. The old code compared raw
              // values but rendered a raw primaryDomain, so matterType='criminal_matter'
              // + primaryDomain='Criminal' produced two identical "Criminal" badges.
              const matterTypeLabel = c.matterType ? displayPracticeArea(c.matterType) : '';
              const primaryDomainLabel = c.primaryDomain ? displayPracticeArea(c.primaryDomain) : '';
              return (
                <>
                  {matterTypeLabel && <Badge variant="default">{matterTypeLabel}</Badge>}
                  {primaryDomainLabel && primaryDomainLabel !== matterTypeLabel && (
                    <Badge variant="muted">{primaryDomainLabel}</Badge>
                  )}
                </>
              );
            })()}
            {statute && <Badge variant="gold"><BookOpen className="size-3.5" />{statute}</Badge>}
            {loc && <Badge variant="muted"><MapPin className="size-3.5" />{loc}</Badge>}
            {c.involvesPolice && <Badge variant="warning">Police involved</Badge>}
          </CardContent>
        </Card>
      )}

      {/* Plain-language analysis — the centrepiece, in the active language */}
      <Card className="relative overflow-hidden border-gold/30 shadow-soft">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-brand-gradient" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5 text-base">
            <span className="grid size-8 place-items-center rounded-lg bg-gold/15 text-gold"><Sparkles className="size-4" /></span>
            {tr('matter.aiResponse', isBn)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysis ? (
            <Prose text={analysis} className={analysisBn ? 'font-bn' : ''} />
          ) : (
            <p className="text-sm text-muted-foreground">{tr('brief.failed', isBn)}</p>
          )}
        </CardContent>
      </Card>

      {/* Procedural + next steps */}
      {(procedural.length > 0 || nextSteps.length > 0) && (
        <div className="grid gap-5 md:grid-cols-2">
          {procedural.length > 0 && (
            <StepCard icon={<Footprints className="size-4 text-gold" />} title={tr('brief.procedural', isBn)} items={procedural} />
          )}
          {nextSteps.length > 0 && (
            <StepCard icon={<ListChecks className="size-4 text-gold" />} title={tr('brief.nextSteps', isBn)} items={nextSteps} />
          )}
        </div>
      )}

      {/* Applicable laws */}
      {c?.applicableLaws && c.applicableLaws.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tr('brief.applicableLaws', isBn)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {c.applicableLaws.map((law, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <span className="text-sm font-medium">
                  {law.act}
                  {law.sections?.length ? <span className="text-muted-foreground"> · {law.sections.join(', ')}</span> : null}
                </span>
                {law.confidence && (
                  <Badge variant="muted" className="capitalize">{law.confidence} {tr('brief.confidence', isBn)}</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Citations */}
      {!!ai.citations?.length && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tr('matter.citations', isBn)}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {ai.citations!.map((cit, i) => <CitationChip key={i} citation={cit} />)}
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
        {ai.disclaimer || tr('matter.disclaimer', isBn)}
      </p>
    </div>
  );
}

function Prose({ text, className }: { text: string | null; className?: string }) {
  if (!text) return <p className="text-sm text-muted-foreground">—</p>;
  return <Markdown text={text} className={cn('space-y-3', className)} />;
}

function StepCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5 text-base">
          <span className="grid size-8 place-items-center rounded-lg bg-gold/12 text-gold">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2.5">
          {items.map((it, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-gold/15 text-[11px] font-bold text-gold">{i + 1}</span>
              <span className="text-foreground/90"><MarkdownInline text={it} /></span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export function AiBriefSkeleton() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-9 w-44 rounded-xl" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}
