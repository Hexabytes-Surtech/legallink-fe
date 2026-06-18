'use client';

import * as React from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Loader2, Save, CalendarClock, Lock } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { AvailabilityRule, SaveAvailabilityInput } from '@/types';

// Backend day_of_week: 0=Mon … 6=Sun
const DAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_BN = ['সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার', 'রবিবার'];

type DayState = { dayOfWeek: number; enabled: boolean; start: string; end: string; slot: number };

const defaults = (): DayState[] =>
  Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i, enabled: false, start: '10:00', end: '17:00', slot: 30 }));

export default function AvailabilityPage() {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';
  const q = useQuery<AvailabilityRule[]>(() => api.get('/advocate/availability'), []);
  // The scheduling calendar is gated behind the advocate SaaS subscription (BE returns 402).
  const locked = q.error instanceof ApiError && q.error.code === 402;
  const [days, setDays] = React.useState<DayState[]>(defaults());
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!q.data) return;
    const next = defaults();
    q.data.forEach((r) => {
      const d = next[r.day_of_week];
      if (d) {
        d.enabled = r.is_active !== false;
        d.start = (r.start_time ?? '10:00').slice(0, 5);
        d.end = (r.end_time ?? '17:00').slice(0, 5);
        d.slot = r.slot_duration_minutes ?? 30;
      }
    });
    setDays(next);
  }, [q.data]);

  const update = (i: number, patch: Partial<DayState>) =>
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  async function save() {
    setSaving(true);
    try {
      const body: SaveAvailabilityInput = {
        slots: days.filter((d) => d.enabled).map((d) => ({
          dayOfWeek: d.dayOfWeek, startTime: d.start, endTime: d.end, slotDurationMinutes: d.slot,
        })),
      };
      await api.put('/advocate/availability', body);
      toast.success(t('adv.avail.saved'));
      q.refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.first : t('shared.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
        <CalendarClock className="size-7 text-gold" /> {t('adv.avail.title')}
      </h1>
      <p className="mt-1 text-muted-foreground">{t('adv.avail.subtitle')}</p>

      {locked ? (
        <Card className="mt-6 border-gold/40 bg-gold/5">
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="flex items-center gap-2 font-medium">
              <Lock className="size-5 text-gold" /> {t('adv.avail.locked.title')}
            </p>
            <p className="text-sm text-muted-foreground">{t('adv.avail.locked.body')}</p>
            <Button asChild className="mt-1">
              <Link href="/advocate/billing">{t('adv.avail.locked.cta')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : q.loading && !q.data ? (
        <Skeleton className="mt-6 h-96 w-full rounded-xl" />
      ) : (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">{(isBn ? DAYS_BN : DAYS_EN).length} {isBn ? 'দিন' : 'days'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {days.map((d, i) => (
              <div key={d.dayOfWeek} className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center">
                <div className="flex w-40 items-center gap-2.5">
                  <Switch checked={d.enabled} onCheckedChange={(v) => update(i, { enabled: v })} aria-label={DAYS_EN[i]} />
                  <span className={`text-sm font-medium ${!d.enabled ? 'text-muted-foreground' : ''}`}>{(isBn ? DAYS_BN : DAYS_EN)[i]}</span>
                </div>
                <div className={`grid flex-1 grid-cols-3 gap-2 ${!d.enabled ? 'pointer-events-none opacity-40' : ''}`}>
                  <label className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">{t('adv.avail.start')}</span>
                    <Input type="time" value={d.start} onChange={(e) => update(i, { start: e.target.value })} className="h-9" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">{t('adv.avail.end')}</span>
                    <Input type="time" value={d.end} onChange={(e) => update(i, { end: e.target.value })} className="h-9" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">{t('adv.avail.slot')}</span>
                    <Select value={String(d.slot)} onValueChange={(v) => update(i, { slot: Number(v) })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[15, 30, 60].map((m) => <SelectItem key={m} value={String(m)}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </label>
                </div>
              </div>
            ))}
            <Button size="lg" disabled={saving} onClick={save}>
              {saving ? <><Loader2 className="size-4 animate-spin" />…</> : <><Save className="size-4" /> {t('shared.save')}</>}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
