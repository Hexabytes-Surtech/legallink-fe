'use client';

import * as React from 'react';
import {
  Gavel, ChevronDown, ChevronUp, CheckCircle2, Lock, Loader2, Download,
  ScrollText, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type {
  ConsultationTimeline as Timeline,
  ConsultationStatus,
  TimelineStageKey,
  AdvanceableStageKey,
  ClosureOutcomeKey,
} from '@/types';
import type { TranslationKey } from '@/i18n/config';

// Canonical stage ladder (the 6 advanceable + the terminal 'closed').
const STAGES: TimelineStageKey[] = [
  'consultation_started', 'advice_review', 'drafting', 'legal_notice',
  'filed_in_court', 'in_hearing', 'closed',
];
const ADVANCEABLE: AdvanceableStageKey[] = [
  'consultation_started', 'advice_review', 'drafting', 'legal_notice',
  'filed_in_court', 'in_hearing',
];
const OUTCOMES: ClosureOutcomeKey[] = [
  'resolved', 'settled', 'withdrawn_by_client', 'referred',
  'advice_only', 'ended_early', 'dismissed_procedure', 'decided_unfavourably',
];

function fmtDate(iso: string | null | undefined, isBn: boolean) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(isBn ? 'bn-IN' : 'en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] as string,
  );
}

/**
 * Case timeline for one consultation.
 *  - Advocate (status 'accepted'): can advance the stage + close with a closure summary.
 *  - Citizen / closed: read-only dated timeline + the downloadable Consultation Closure Summary.
 * `version` bumps (from the chat socket's `timeline_updated`) trigger a re-fetch.
 */
export function ConsultationTimeline({
  consultationId,
  isAdvocate,
  version = 0,
  defaultOpen = false,
  embedded = false,
}: {
  consultationId: string;
  isAdvocate: boolean;
  version?: number;
  defaultOpen?: boolean;
  /** Render without the collapsible Card chrome (for a dedicated side panel / drawer). */
  embedded?: boolean;
}) {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';
  const q = useQuery<Timeline>(
    () => api.get(`/consultations/${consultationId}/timeline`),
    [consultationId, version],
  );
  const data = q.data;
  const [open, setOpen] = React.useState(defaultOpen);

  // ── advance-stage dialog state ──
  const [advanceOpen, setAdvanceOpen] = React.useState(false);
  const [stage, setStage] = React.useState<AdvanceableStageKey | ''>('');
  const [note, setNote] = React.useState('');
  const [advancing, setAdvancing] = React.useState(false);

  // ── close dialog state ──
  const [closeOpen, setCloseOpen] = React.useState(false);
  const [outcome, setOutcome] = React.useState<ClosureOutcomeKey | ''>('');
  const [summary, setSummary] = React.useState('');
  const [settlement, setSettlement] = React.useState('');
  const [newAdvocate, setNewAdvocate] = React.useState('');
  const [nocIssued, setNocIssued] = React.useState(false);
  const [nextSteps, setNextSteps] = React.useState('');
  const [docsReturned, setDocsReturned] = React.useState(false);
  const [feesSettled, setFeesSettled] = React.useState(false);
  const [closing, setClosing] = React.useState(false);

  const status: ConsultationStatus = data?.status ?? 'accepted';
  const isClosed = status === 'closed';
  const currentStage: TimelineStageKey = data?.currentStage ?? 'consultation_started';
  const canEdit = isAdvocate && status === 'accepted';
  const events = data?.events ?? [];
  const closure = data?.closure ?? null;

  const stageLabel = (k: TimelineStageKey) => t(`timeline.stage.${k}` as TranslationKey);
  const stageDesc = (k: TimelineStageKey) => t(`timeline.stageDesc.${k}` as TranslationKey);
  const outcomeLabel = (k: ClosureOutcomeKey) => t(`timeline.outcome.${k}` as TranslationKey);
  const actorLabel = (a: string) =>
    a === 'advocate' ? t('timeline.by.advocate') : a === 'citizen' ? t('timeline.by.citizen') : t('timeline.by.system');

  async function submitAdvance() {
    if (!stage || advancing) return;
    setAdvancing(true);
    try {
      await api.put(`/consultations/${consultationId}/stage`, {
        stageKey: stage,
        note: note.trim() || undefined,
      });
      toast.success(t('timeline.saved'));
      setAdvanceOpen(false);
      setStage('');
      setNote('');
      q.refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.first : t('shared.error'));
    } finally {
      setAdvancing(false);
    }
  }

  async function submitClose() {
    if (!outcome || !summary.trim() || closing) return;
    setClosing(true);
    try {
      await api.put(`/consultations/${consultationId}/close`, {
        outcomeKey: outcome,
        summary: summary.trim(),
        settlement: outcome === 'settled' ? settlement.trim() || undefined : undefined,
        newAdvocate: outcome === 'referred' ? newAdvocate.trim() || undefined : undefined,
        nocIssued: outcome === 'referred' ? nocIssued : undefined,
        nextSteps:
          outcome === 'dismissed_procedure' || outcome === 'decided_unfavourably'
            ? nextSteps.trim() || undefined
            : undefined,
        documentsReturned: docsReturned,
        feesSettled,
      });
      toast.success(t('closure.success'));
      setCloseOpen(false);
      q.refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.first : t('shared.error'));
    } finally {
      setClosing(false);
    }
  }

  // Self-contained print → PDF (no new route / no server dep). Built from the closure
  // data already in hand; printed from the opener so no inline script is needed.
  function downloadPdf() {
    if (!data || !closure) return;
    const L = (k: string) => t(k as TranslationKey);
    const row = (label: string, value: string) =>
      `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`;
    const rows: string[] = [];
    rows.push(row(L('closure.reference'), shortId(data.consultationId)));
    rows.push(row(L('closure.client'), closure.citizenName || '—'));
    rows.push(row(L('closure.issuedBy'), closure.advocateName || '—'));
    if (closure.barEnrolmentNumber) rows.push(row(L('closure.enrolment'), closure.barEnrolmentNumber));
    rows.push(row(L('closure.issuedOn'), fmtDate(closure.closedAt, isBn)));
    rows.push(row(L('closure.outcome'), closure.outcomeKey ? outcomeLabel(closure.outcomeKey) : stageLabel('closed')));
    if (closure.settlement) rows.push(row(L('closure.settlement'), closure.settlement));
    if (closure.newAdvocate) rows.push(row(L('closure.referredTo'), closure.newAdvocate));
    if (closure.outcomeKey === 'referred') rows.push(row(L('closure.nocIssued'), closure.nocIssued ? L('closure.yes') : L('closure.no')));
    if (closure.nextSteps) rows.push(row(L('closure.nextSteps'), closure.nextSteps));
    rows.push(row(L('closure.documentsReturned'), closure.documentsReturned ? L('closure.yes') : L('closure.no')));
    rows.push(row(L('closure.feesSettled'), closure.feesSettled ? L('closure.yes') : L('closure.no')));

    const summaryHtml = closure.summary
      ? `<h2>${escapeHtml(L('closure.adviceLabel'))}</h2><p class="advice">${escapeHtml(closure.summary).replace(/\n/g, '<br/>')}</p>`
      : '';

    const html = `<!doctype html><html lang="${isBn ? 'bn' : 'en'}"><head><meta charset="utf-8"/>
<title>${escapeHtml(L('closure.summaryTitle'))} · ${shortId(data.consultationId)}</title>
<style>
  *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;margin:0;padding:40px;line-height:1.55}
  .wrap{max-width:720px;margin:0 auto}
  .brand{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#0a78c0;font-weight:700}
  h1{font-size:22px;margin:6px 0 2px} .ref{color:#666;font-size:13px;margin:0 0 22px}
  table{width:100%;border-collapse:collapse;margin:6px 0 18px}
  th,td{text-align:left;vertical-align:top;padding:7px 10px;border-bottom:1px solid #e7e7ee;font-size:14px}
  th{width:42%;color:#555;font-weight:600}
  h2{font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:#444;margin:18px 0 6px}
  .advice{font-size:14px;white-space:pre-wrap;background:#f6f8fc;border:1px solid #e7e7ee;border-radius:8px;padding:12px 14px;margin:0}
  .disc{margin-top:26px;font-size:12px;color:#888;border-top:1px solid #e7e7ee;padding-top:12px}
</style></head><body><div class="wrap">
  <div class="brand">LegalLink</div>
  <h1>${escapeHtml(L('closure.summaryTitle'))}</h1>
  <p class="ref">${escapeHtml(L('closure.reference'))}: ${shortId(data.consultationId)}</p>
  <table>${rows.join('')}</table>
  ${summaryHtml}
  <p class="disc">${escapeHtml(L('closure.disclaimer'))}</p>
</div></body></html>`;

    const w = window.open('', '_blank', 'width=820,height=1000');
    if (!w) {
      toast.error(t('shared.error'));
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      try { w.print(); } catch { /* user can print manually */ }
    }, 400);
  }

  // Don't show the timeline for requests that were never accepted.
  if (data && status !== 'accepted' && status !== 'closed') return null;

  const bodyOpen = embedded || open;

  return (
    <Card className={cn('overflow-hidden', embedded && 'border-0 bg-transparent shadow-none')}>
      {embedded ? (
        <div className="flex items-center justify-between gap-2 pb-1">
          <span className="flex items-center gap-2 font-semibold">
            <Gavel className="size-4 text-primary" />
            {t('timeline.title')}
          </span>
          <Badge variant={isClosed ? 'muted' : 'success'} className="shrink-0">
            {isClosed && <Lock className="size-3" />}
            {stageLabel(currentStage)}
          </Badge>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/40"
          aria-expanded={open}
        >
          <span className="flex items-center gap-2 font-semibold">
            <Gavel className="size-4 text-primary" />
            {t('timeline.title')}
          </span>
          <span className="flex items-center gap-2">
            <Badge variant={isClosed ? 'muted' : 'success'} className="max-w-[55vw] truncate sm:max-w-none">
              {isClosed && <Lock className="size-3" />}
              {stageLabel(currentStage)}
            </Badge>
            {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </span>
        </button>
      )}

      {bodyOpen && (
        <div className={cn(embedded ? 'pt-1' : 'border-t border-border px-4 py-4')}>
          <p className="mb-3 text-xs text-muted-foreground">
            {isAdvocate ? t('timeline.subtitle.advocate') : t('timeline.subtitle.citizen')}
          </p>

          {q.loading && !data ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> …
            </div>
          ) : events.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">{t('timeline.empty')}</p>
          ) : (
            <ol className="relative">
              {events.map((e, i) => {
                const last = i === events.length - 1;
                const isClosedEvent = e.stageKey === 'closed';
                const isCurrent = last && !isClosedEvent;
                const dotCls = isClosedEvent
                  ? 'bg-muted text-muted-foreground'
                  : isCurrent
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/15'
                    : 'bg-success/15 text-success';
                const Icon = isClosedEvent ? Lock : isCurrent ? ArrowRight : CheckCircle2;
                return (
                  <li key={e.eventId} className="relative flex gap-3 pb-5 last:pb-0">
                    {!last && <span className="absolute left-[11px] top-7 bottom-0 w-px bg-border" aria-hidden />}
                    <span className={cn('relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full', dotCls)}>
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-tight">{stageLabel(e.stageKey)}</p>
                      {!isClosedEvent && <p className="text-xs leading-snug text-muted-foreground">{stageDesc(e.stageKey)}</p>}
                      {e.note && (
                        <p className="mt-1.5 rounded-lg bg-muted/60 px-3 py-1.5 text-sm leading-relaxed">{e.note}</p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {actorLabel(e.actorType)} · {fmtDate(e.createdAt, isBn)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {/* Advocate controls (only while accepted) */}
          {canEdit && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
              <Button size="sm" variant="outline" onClick={() => setAdvanceOpen(true)}>
                <ArrowRight className="size-4" /> {t('timeline.update')}
              </Button>
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setCloseOpen(true)}>
                <Lock className="size-4" /> {t('closure.cta')}
              </Button>
            </div>
          )}

          {/* Closure summary card — visible to both once closed */}
          {isClosed && closure && (
            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="flex items-center gap-2 font-display font-semibold">
                  <ScrollText className="size-4 text-primary" /> {t('closure.summaryTitle')}
                </p>
                <Button size="sm" variant="outline" onClick={downloadPdf}>
                  <Download className="size-4" /> {t('closure.download')}
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="default">
                  {closure.outcomeKey ? outcomeLabel(closure.outcomeKey) : stageLabel('closed')}
                </Badge>
                <span className="text-xs text-muted-foreground">{fmtDate(closure.closedAt, isBn)}</span>
              </div>

              {closure.summary && (
                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-background/70 px-3 py-2.5 text-sm leading-relaxed">
                  {closure.summary}
                </p>
              )}

              <dl className="mt-3 space-y-1.5 text-sm">
                {closure.settlement && <Field label={t('closure.settlement')} value={closure.settlement} />}
                {closure.newAdvocate && <Field label={t('closure.referredTo')} value={closure.newAdvocate} />}
                {closure.nextSteps && <Field label={t('closure.nextSteps')} value={closure.nextSteps} />}
                {closure.advocateName && <Field label={t('closure.issuedBy')} value={closure.advocateName} />}
                {closure.barEnrolmentNumber && <Field label={t('closure.enrolment')} value={closure.barEnrolmentNumber} />}
              </dl>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={closure.documentsReturned ? 'success' : 'muted'}>
                  {closure.documentsReturned ? <CheckCircle2 className="size-3" /> : null}
                  {t('closure.documentsReturned')}
                </Badge>
                <Badge variant={closure.feesSettled ? 'success' : 'muted'}>
                  {closure.feesSettled ? <CheckCircle2 className="size-3" /> : null}
                  {t('closure.feesSettled')}
                </Badge>
              </div>

              <p className="mt-3 text-[11px] italic text-muted-foreground">{t('closure.disclaimer')}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Advance-stage dialog ── */}
      <Dialog open={advanceOpen} onOpenChange={(o) => { if (!advancing) setAdvanceOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('timeline.update')}</DialogTitle>
            <DialogDescription>{t('timeline.subtitle.advocate')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t('timeline.stageField')}</Label>
            <Select value={stage || undefined} onValueChange={(v) => setStage(v as AdvanceableStageKey)}>
              <SelectTrigger><SelectValue placeholder={t('timeline.current')} /></SelectTrigger>
              <SelectContent>
                {ADVANCEABLE.map((s) => (
                  <SelectItem key={s} value={s}>{stageLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tl-note">{t('timeline.note')}</Label>
            <Textarea
              id="tl-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              placeholder={t('timeline.notePlaceholder')}
              className="min-h-20"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvanceOpen(false)} disabled={advancing}>{t('shared.cancel')}</Button>
            <Button onClick={submitAdvance} disabled={!stage || advancing}>
              {advancing ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />} {t('timeline.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Close / closure-summary dialog ── */}
      <Dialog open={closeOpen} onOpenChange={(o) => { if (!closing) setCloseOpen(o); }}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="size-4" /> {t('closure.title')}</DialogTitle>
            <DialogDescription>{t('closure.body')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>{t('closure.outcome')}</Label>
            <Select value={outcome || undefined} onValueChange={(v) => setOutcome(v as ClosureOutcomeKey)}>
              <SelectTrigger><SelectValue placeholder={t('closure.outcome')} /></SelectTrigger>
              <SelectContent>
                {OUTCOMES.map((o) => (
                  <SelectItem key={o} value={o}>{outcomeLabel(o)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cl-summary">{t('closure.summary')}</Label>
            <Textarea
              id="cl-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={4000}
              placeholder={t('closure.summaryPlaceholder')}
              className="min-h-28"
            />
            <p className="text-right text-xs text-muted-foreground">{summary.length}/4000</p>
          </div>

          {outcome === 'settled' && (
            <div className="space-y-2">
              <Label htmlFor="cl-settle">{t('closure.settlement')}</Label>
              <Textarea id="cl-settle" value={settlement} onChange={(e) => setSettlement(e.target.value)} maxLength={2000} className="min-h-16" />
            </div>
          )}

          {outcome === 'referred' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="cl-newadv">{t('closure.newAdvocate')}</Label>
                <Textarea id="cl-newadv" value={newAdvocate} onChange={(e) => setNewAdvocate(e.target.value)} maxLength={500} className="min-h-12" />
              </div>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                <span className="text-sm">{t('closure.nocIssued')}</span>
                <Switch checked={nocIssued} onCheckedChange={setNocIssued} />
              </label>
            </>
          )}

          {(outcome === 'dismissed_procedure' || outcome === 'decided_unfavourably') && (
            <div className="space-y-2">
              <Label htmlFor="cl-next">{t('closure.nextSteps')}</Label>
              <Textarea id="cl-next" value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} maxLength={2000} className="min-h-16" />
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">{t('closure.dutyNote')}</p>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">{t('closure.documentsReturned')}</span>
              <Switch checked={docsReturned} onCheckedChange={setDocsReturned} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">{t('closure.feesSettled')}</span>
              <Switch checked={feesSettled} onCheckedChange={setFeesSettled} />
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)} disabled={closing}>{t('shared.cancel')}</Button>
            <Button variant="destructive" onClick={submitClose} disabled={!outcome || !summary.trim() || closing}>
              {closing ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />} {t('closure.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <dt className="font-medium text-muted-foreground">{label}:</dt>
      <dd className="min-w-0 flex-1 whitespace-pre-wrap break-words">{value}</dd>
    </div>
  );
}
