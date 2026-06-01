'use client';

import * as React from 'react';
import { Loader2, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api/client';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SlotPicker } from './slot-picker';
import type { AppointmentMutationResponse } from '@/types';

/** Reschedule an existing appointment to a new IST slot. */
export function BookingDialog({
  appointmentId,
  advocateId,
  trigger,
  onDone,
}: {
  appointmentId: string;
  advocateId: string;
  trigger: React.ReactNode;
  onDone?: () => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const [scheduledAt, setScheduledAt] = React.useState<string | null>(null);
  const [label, setLabel] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function confirm() {
    if (!scheduledAt) return;
    setBusy(true);
    try {
      await api.put<AppointmentMutationResponse>(`/appointments/${appointmentId}`, { action: 'reschedule', scheduledAt });
      toast.success(t('booking.rescheduled'));
      setOpen(false);
      onDone?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.first : t('intake.error.generic'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setScheduledAt(null); setLabel(''); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarClock className="size-5 text-gold" /> {t('booking.title')}</DialogTitle>
          <DialogDescription>{t('matters.reschedule')}</DialogDescription>
        </DialogHeader>
        <SlotPicker advocateId={advocateId} value={scheduledAt} onSelect={(s, l) => { setScheduledAt(s); setLabel(l); }} />
        <Button size="lg" className="w-full" disabled={!scheduledAt || busy} onClick={confirm}>
          {busy ? <><Loader2 className="size-4 animate-spin" />…</> : scheduledAt ? `${t('booking.confirm')} — ${label}` : t('booking.pickTime')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
