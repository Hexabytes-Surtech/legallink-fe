'use client';

import * as React from 'react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import type { AvailabilityDay } from '@/types';
import { cn } from '@/lib/utils';

const IST_OFFSET_MIN = 330;

/** Today's date (YYYY-MM-DD) in IST. */
function istToday(): string {
  const now = new Date();
  return new Date(now.getTime() + IST_OFFSET_MIN * 60000).toISOString().slice(0, 10);
}
function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** An IST wall-clock slot (date + HH:MM) → the UTC instant the backend expects. */
export function istSlotToInstant(date: string, time: string): string {
  return new Date(`${date}T${time}:00+05:30`).toISOString();
}
function dayLabel(date: string, isBn: boolean) {
  const d = new Date(date + 'T12:00:00');
  return {
    wd: d.toLocaleDateString(isBn ? 'bn-IN' : 'en-IN', { weekday: 'short' }),
    dm: d.toLocaleDateString(isBn ? 'bn-IN' : 'en-IN', { day: 'numeric', month: 'short' }),
  };
}
function group(slots: { time: string; available: boolean }[]) {
  return {
    morning: slots.filter((s) => s.time < '12:00'),
    afternoon: slots.filter((s) => s.time >= '12:00' && s.time < '17:00'),
    evening: slots.filter((s) => s.time >= '17:00'),
  };
}

export function SlotPicker({
  advocateId,
  value,
  onSelect,
}: {
  advocateId: string;
  /** Currently selected scheduledAt (UTC ISO) — for highlight. */
  value?: string | null;
  onSelect: (scheduledAt: string, label: string) => void;
}) {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';
  const from = istToday();
  const to = addDays(from, 13);

  const q = useQuery<AvailabilityDay[]>(
    () => api.get(`/advocates/${advocateId}/availability`, { skipAuth: true, query: { from, to } }),
    [advocateId],
  );

  const days = React.useMemo(() => (q.data ?? []).filter((d) => d.slots.some((s) => s.available)), [q.data]);
  const [activeDate, setActiveDate] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (days.length && !activeDate) setActiveDate(days[0].date);
  }, [days, activeDate]);

  if (q.loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (!days.length) {
    return <p className="rounded-lg border border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">{t('booking.noSlots')}</p>;
  }

  const active = days.find((d) => d.date === activeDate) ?? days[0];
  const { morning, afternoon, evening } = group(active.slots);
  const sections = [
    { label: t('booking.morning'), slots: morning },
    { label: t('booking.afternoon'), slots: afternoon },
    { label: t('booking.evening'), slots: evening },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{t('booking.subtitle')}</p>

      {/* Date strip */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => {
          const l = dayLabel(d.date, isBn);
          const isActive = d.date === active.date;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => setActiveDate(d.date)}
              className={cn(
                'flex shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition-colors',
                isActive ? 'border-gold bg-gold/10 text-foreground' : 'border-border hover:border-gold/40',
              )}
            >
              <span className="text-[11px] uppercase text-muted-foreground">{l.wd}</span>
              <span className="text-sm font-semibold">{l.dm}</span>
            </button>
          );
        })}
      </div>

      {/* Slots */}
      <div className="space-y-3">
        {sections.filter((s) => s.slots.length > 0).map((sec) => (
          <div key={sec.label}>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{sec.label}</p>
            <div className="flex flex-wrap gap-2">
              {sec.slots.map((s) => {
                const instant = istSlotToInstant(active.date, s.time);
                const selected = value === instant;
                return (
                  <button
                    key={s.time}
                    type="button"
                    disabled={!s.available}
                    onClick={() => onSelect(instant, `${dayLabel(active.date, isBn).dm}, ${s.time} IST`)}
                    className={cn(
                      'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                      selected
                        ? 'border-gold bg-gold text-primary-foreground'
                        : 'border-border hover:border-gold/50 hover:bg-gold/10',
                    )}
                  >
                    {s.time}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
