'use client';

import * as React from 'react';
import { Loader2, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api/client';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { ReportReason } from '@/types';
import type { TranslationKey } from '@/i18n/config';

const REASONS: ReportReason[] = ['abusive', 'spam', 'ended_unfairly', 'off_platform_contact', 'other'];

/** Advocate-only dialog to report the citizen on a closed consultation. */
export function ReportDialog({
  consultationId,
  trigger,
  onDone,
}: {
  consultationId: string;
  trigger: React.ReactNode;
  onDone?: () => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState<ReportReason | ''>('');
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  function reset() {
    setReason('');
    setNote('');
  }

  async function submit() {
    if (!reason) return;
    setBusy(true);
    try {
      await api.post(`/consultations/${consultationId}/report`, {
        reason,
        note: note.trim() || undefined,
      });
      toast.success(t('report.success'));
      setOpen(false);
      reset();
      onDone?.();
    } catch (err) {
      // 409 = already reported — surface a clear message and refresh state.
      if (err instanceof ApiError && err.code === 409) {
        toast.error(t('report.alreadyReported'));
        setOpen(false);
        onDone?.();
      } else {
        toast.error(err instanceof ApiError ? err.first : t('shared.error'));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) { setOpen(o); if (!o) reset(); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Flag className="size-4 text-destructive" /> {t('report.title')}</DialogTitle>
          <DialogDescription>{t('report.body')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>{t('report.reason')}</Label>
          <Select value={reason || undefined} onValueChange={(v) => setReason(v as ReportReason)}>
            <SelectTrigger>
              <SelectValue placeholder={t('report.reason')} />
            </SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => (
                <SelectItem key={r} value={r}>{t(`report.reason.${r}` as TranslationKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="report-note">{t('report.note')}</Label>
          <Textarea
            id="report-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            placeholder={t('report.notePlaceholder')}
            className="min-h-24"
          />
          <p className="text-right text-xs text-muted-foreground">{note.length}/1000</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>{t('shared.cancel')}</Button>
          <Button variant="destructive" onClick={submit} disabled={!reason || busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Flag className="size-4" />} {t('report.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
