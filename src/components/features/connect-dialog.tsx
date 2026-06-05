'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AuthOtpForm } from './auth-otp-form';
import { SlotPicker } from './slot-picker';
import type { ConsultationCreateResponse } from '@/types';

export function ConnectDialog({
  matterId,
  advocateId,
  advocateName,
  trigger,
}: {
  matterId: string;
  advocateId: string;
  advocateName?: string;
  trigger: React.ReactNode;
}) {
  const { t } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [scheduleOn, setScheduleOn] = React.useState(false);
  const [scheduledAt, setScheduledAt] = React.useState<string | null>(null);
  const [slotLabel, setSlotLabel] = React.useState('');
  const noteRef = React.useRef('');
  noteRef.current = note;
  const scheduledRef = React.useRef<string | null>(null);
  scheduledRef.current = scheduleOn ? scheduledAt : null;

  async function createConsultation() {
    setBusy(true);
    try {
      const res = await api.post<ConsultationCreateResponse>('/consultations', {
        matterId,
        advocateId,
        citizenNote: noteRef.current.trim() || undefined,
        scheduledAt: scheduledRef.current || undefined,
      });
      toast.success(t('connect.success'));
      setOpen(false);
      router.push('/matters');
      return res;
    } catch (err) {
      const msg = err instanceof ApiError ? err.first : t('intake.error.generic');
      toast.error(msg);
      setBusy(false);
      throw err;
    }
  }

  const canRequestDirectly = isAuthenticated && user?.role === 'citizen';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('connect.title')}</DialogTitle>
          <DialogDescription>
            {advocateName ? `${advocateName} · ` : ''}{t('connect.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="connect-note">
            {t('connect.noteField')} <span className="font-normal text-muted-foreground">({t('shared.optional')})</span>
          </Label>
          <Textarea
            id="connect-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            placeholder={t('connect.notePlaceholder')}
            className="min-h-24"
          />
        </div>

        {/* Optional scheduling */}
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="schedule-toggle" className="cursor-pointer">{t('booking.scheduleOption')}</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">{t('booking.scheduleHint')}</p>
            </div>
            <Switch id="schedule-toggle" checked={scheduleOn} onCheckedChange={setScheduleOn} />
          </div>
          {scheduleOn && (
            <div className="mt-3 border-t border-border pt-3">
              <SlotPicker
                advocateId={advocateId}
                value={scheduledAt}
                onSelect={(s, l) => { setScheduledAt(s); setSlotLabel(l); }}
              />
              {scheduledAt && <p className="mt-2 text-xs font-medium text-primary">{slotLabel}</p>}
            </div>
          )}
        </div>

        {/* Rule 36 safety note */}
        <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs leading-relaxed text-foreground/80">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          {t('connect.note')}
        </p>

        {canRequestDirectly ? (
          <Button size="lg" className="w-full" disabled={busy} onClick={() => void createConsultation()}>
            {busy ? <><Loader2 className="size-4 animate-spin" />{t('auth.step2.verifying')}</> : <><Send className="size-4" />{t('connect.submit')}</>}
          </Button>
        ) : isAuthenticated ? (
          <p className="text-center text-sm text-muted-foreground">
            Only citizen accounts can request consultations.
          </p>
        ) : (
          <div className="space-y-3">
            <Separator />
            <p className="text-sm text-muted-foreground">{t('auth.signup.subtitle')}</p>
            <AuthOtpForm
              mode="signup"
              redirectTo={false}
              onAuthenticated={async () => { await createConsultation(); }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
