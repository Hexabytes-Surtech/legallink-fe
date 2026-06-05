'use client';

import * as React from 'react';
import Link from 'next/link';
import { FolderOpen, Clock, Mail, Plus, Scale, ArrowRight, MessageSquare, Sparkles, MessagesSquare } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import type { MatterListItem, ConsultationListItem, ConsultationStatus } from '@/types';
import type { TranslationKey } from '@/i18n/config';
import type { LucideIcon } from 'lucide-react';

const STATUS_BADGE: Record<ConsultationStatus, { key: TranslationKey; variant: 'warning' | 'success' | 'destructive' | 'muted' }> = {
  pending: { key: 'matters.consult.pending', variant: 'warning' },
  accepted: { key: 'matters.consult.accepted', variant: 'success' },
  declined: { key: 'matters.consult.declined', variant: 'destructive' },
  closed: { key: 'matters.consult.closed', variant: 'muted' },
};

export default function CitizenDashboardPage() {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';
  const { user } = useAuth();

  const mattersQ = useQuery<MatterListItem[] | { matters: MatterListItem[] }>(() => api.get('/matter'), []);
  const consultsQ = useQuery<ConsultationListItem[]>(() => api.get('/consultations'), []);

  const matters = React.useMemo(() => {
    const d = mattersQ.data;
    return Array.isArray(d) ? d : d?.matters ?? [];
  }, [mattersQ.data]);

  const consults = React.useMemo(() => consultsQ.data ?? [], [consultsQ.data]);
  const consultByMatter = React.useMemo(() => {
    const map = new Map<string, ConsultationListItem>();
    consults.forEach((c) => map.set(c.matter_id, c));
    return map;
  }, [consults]);

  const stats: { key: TranslationKey; value: number; icon: LucideIcon; tint: string }[] = [
    { key: 'dashboard.stat.active', value: consults.filter((c) => c.status === 'accepted').length, icon: MessageSquare, tint: 'text-success' },
    { key: 'dashboard.stat.pending', value: consults.filter((c) => c.status === 'pending').length, icon: Clock, tint: 'text-gold-bright' },
    { key: 'dashboard.stat.unread', value: consults.reduce((n, c) => n + (c.unread ? 1 : 0), 0), icon: Mail, tint: 'text-info' },
  ];

  const loading = (mattersQ.loading && matters.length === 0) || (consultsQ.loading && consults.length === 0);
  const recent = matters.slice(0, 4);
  const firstName = (user?.name || user?.email?.split('@')[0] || '').split(/\s+/)[0];

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
      {/* ── Hero band (compact) ───────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="pointer-events-none absolute inset-0 bg-aurora-blobs opacity-50 dark:opacity-75" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
              {t('dashboard.welcome')}{firstName ? <span className="text-gradient-gold">, {firstName}</span> : ''}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
          </div>
          <Button asChild className="bg-brand-gradient text-white shadow-lift transition-transform hover:scale-[1.02]">
            <Link href="/ask"><Sparkles className="size-4" /> {t('citizen.nav.askAi')}</Link>
          </Button>
        </div>

        {/* Inline stats */}
        <div className="relative mt-4 grid grid-cols-3 gap-2.5 sm:max-w-xl">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.key} className="rounded-xl border border-border/70 bg-background/50 px-3 py-2 backdrop-blur transition-colors hover:border-gold/40">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Icon className={`size-3.5 ${s.tint}`} />
                  <span className="text-[10px] font-medium uppercase leading-tight tracking-wide">{t(s.key)}</span>
                </div>
                {loading
                  ? <Skeleton className="mt-1 h-7 w-8" />
                  : <p className="mt-0.5 font-display text-xl font-semibold leading-none sm:text-2xl">{s.value}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Content grid ──────────────────────────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Recent matters */}
        <Card className="lg:col-span-2">
          <CardContent className="py-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold tracking-tight">{t('dashboard.recent')}</h2>
              {matters.length > 0 && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/matters">{t('dashboard.viewAll')} <ArrowRight className="size-4" /></Link>
                </Button>
              )}
            </div>

            {loading ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : recent.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={FolderOpen}
                  title={t('matters.empty')}
                  action={<Button asChild><Link href="/ask"><Plus className="size-4" /> {t('matters.empty.cta')}</Link></Button>}
                />
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">
                {recent.map((m) => {
                  const consult = consultByMatter.get(m.matterId);
                  const badge = consult ? STATUS_BADGE[consult.status] : null;
                  return (
                    <Link
                      key={m.matterId}
                      href={`/matter/${m.matterId}`}
                      className="group flex items-center gap-3 rounded-xl border border-border bg-background/40 px-4 py-3 transition-colors hover:border-gold/50 hover:bg-accent"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {badge ? <Badge variant={badge.variant}>{t(badge.key)}</Badge> : <Badge variant="muted">{t('matters.consult.none')}</Badge>}
                          {consult?.advocateName && <span className="truncate text-xs text-muted-foreground">· {consult.advocateName}</span>}
                        </div>
                        <p className={`mt-1.5 line-clamp-1 text-sm text-foreground/90 ${m.language === 'bn' ? 'font-bn' : ''}`}>{m.query}</p>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-gold" />
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side column */}
        <aside className="space-y-4">
          {/* Find advocate promo */}
          <Card className="relative overflow-hidden border-0 text-white shadow-lift">
            <div className="absolute inset-0 bg-brand-gradient" />
            <CardContent className="relative py-6">
              <Scale className="size-6" />
              <h3 className="mt-3 font-display text-lg font-semibold">{t('dashboard.action.find.title')}</h3>
              <p className="mt-1 text-sm text-white/80">{t('dashboard.action.find.desc')}</p>
              <Button asChild variant="secondary" className="mt-4 w-full">
                <Link href="/advocates">{t('citizen.nav.advocates')} <ArrowRight className="size-4" /></Link>
              </Button>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <span className="grid size-10 place-items-center rounded-xl bg-gold/10 text-gold">
                <MessagesSquare className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t('citizen.nav.messages')}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {stats[0].value > 0 ? `${stats[0].value} ${t('dashboard.stat.active').toLowerCase()}` : t('chat.noConversations')}
                </p>
              </div>
              <Button asChild size="icon" variant="ghost"><Link href="/messages" aria-label={t('citizen.nav.messages')}><ArrowRight className="size-4" /></Link></Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
