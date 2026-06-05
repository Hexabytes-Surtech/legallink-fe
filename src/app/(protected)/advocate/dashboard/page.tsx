'use client';

import * as React from 'react';
import Link from 'next/link';
import { Inbox, CheckCircle2, Archive, Users, Star, ShieldAlert, ArrowRight, FileText } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AvatarFallback } from '@/components/ui/avatar';
import { ViewableAvatar } from '@/components/shared/viewable-avatar';
import { VerificationBadge } from '@/components/shared/verification-badge';
import { ViewDocumentButton } from '@/components/features/document-viewer';
import type { AdvocateDashboard, AdvocateDoc } from '@/types';
import type { TranslationKey } from '@/i18n/config';
import type { LucideIcon } from 'lucide-react';

const n = (v: string | number | undefined) => (typeof v === 'number' ? v : Number(v ?? 0));

export default function AdvocateDashboardPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const q = useQuery<AdvocateDashboard>(() => api.get('/advocate/dashboard'), []);
  const docsQ = useQuery<AdvocateDoc[]>(() => api.get('/advocate/documents'), []);
  const d = q.data;
  const docs = docsQ.data ?? [];
  const avatarName = user?.name || 'Advocate';
  const initials = avatarName.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');

  // Time-of-day greeting, resolved after mount to avoid an SSR/client hydration mismatch.
  const [greetKey, setGreetKey] = React.useState<TranslationKey>('adv.dash.greet.hello');
  React.useEffect(() => {
    const h = new Date().getHours();
    setGreetKey(h < 12 ? 'adv.dash.greet.morning' : h < 17 ? 'adv.dash.greet.afternoon' : 'adv.dash.greet.evening');
  }, []);

  const stats: { icon: LucideIcon; key: TranslationKey; value: number; tone: string }[] = d
    ? [
        { icon: Inbox, key: 'adv.dash.pending', value: n(d.consultationStats.pending_count), tone: 'text-warning' },
        { icon: CheckCircle2, key: 'adv.dash.active', value: n(d.consultationStats.accepted_count), tone: 'text-success' },
        { icon: Archive, key: 'adv.dash.closed', value: n(d.consultationStats.closed_count), tone: 'text-muted-foreground' },
        { icon: Users, key: 'adv.dash.total', value: n(d.consultationStats.total_count), tone: 'text-primary' },
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      {/* Greeting hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-brand-soft px-5 py-6 sm:px-7">
        <div className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <ViewableAvatar
            src={user?.avatar_url}
            name={avatarName}
            className="size-16 shrink-0 ring-2 ring-gold/30 sm:size-20"
            fallback={<AvatarFallback className="text-xl">{initials}</AvatarFallback>}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{t(greetKey)},</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h1 className="truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl">{user?.name || t('adv.dash.title')}</h1>
              {d && <VerificationBadge status={d.verificationStatus} />}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t('adv.dash.heroSubtitle')}</p>
          </div>
        </div>
      </div>

      {/* Verification banner */}
      {d && d.verificationStatus !== 'verified' && (
        d.verificationStatus === 'rejected' ? (
          <Card className="mt-6 border-destructive/40 bg-destructive/5">
            <CardContent className="flex flex-col gap-3 py-5">
              <p className="flex items-start gap-2 text-sm text-foreground/80">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
                {t('adv.dash.rejected')}
              </p>
              {d.rejectionReason && (
                <div className="rounded-md border border-destructive/20 bg-background px-3 py-2 text-sm">
                  <span className="font-medium text-destructive">{t('adv.dash.rejectionReason')}: </span>
                  <span className="text-foreground/80">{d.rejectionReason}</span>
                </div>
              )}
              <div className="flex justify-end">
                <Button asChild variant="destructive" className="shrink-0"><Link href="/advocate/onboarding">{t('adv.dash.resubmit')} <ArrowRight className="size-4" /></Link></Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-6 border-warning/40 bg-warning/5">
            <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2 text-sm text-foreground/80">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
                {t('adv.dash.notVerified')}
              </p>
              <Button asChild className="shrink-0"><Link href="/advocate/onboarding">{t('adv.dash.finishOnboarding')} <ArrowRight className="size-4" /></Link></Button>
            </CardContent>
          </Card>
        )
      )}

      {/* Stat cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {q.loading && !d
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : stats.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.key}>
                  <CardContent className="py-5">
                    <Icon className={`size-5 ${s.tone}`} />
                    <p className="mt-3 font-display text-3xl font-semibold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{t(s.key)}</p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Rating + completeness */}
      {d && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-4 py-5">
              <span className="grid size-12 place-items-center rounded-full bg-gold/12 text-gold"><Star className="size-6" /></span>
              <div>
                <p className="font-display text-2xl font-semibold">{d.averageRating != null ? d.averageRating.toFixed(1) : '—'}</p>
                <p className="text-xs text-muted-foreground">{t('adv.dash.rating')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{t('adv.dash.completeness')}</span>
                <span className="font-semibold text-primary">{d.profileCompleteness}%</span>
              </div>
              <Progress value={d.profileCompleteness} className="mt-3" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Documents + requests — same column width as the rating/completeness row */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* Documents */}
        <Card>
          <CardContent className="py-5">
            <p className="font-medium">{t('adv.dash.documents')}</p>
            {docsQ.loading && docs.length === 0 ? (
              <Skeleton className="mt-3 h-12 w-full rounded-lg" />
            ) : docs.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t('adv.docs.empty')}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {docs.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gold/10 text-gold"><FileText className="size-4" /></span>
                      <span className="truncate text-sm font-medium uppercase">{doc.file_type?.split('/').pop() || 'FILE'}</span>
                    </span>
                    <ViewDocumentButton url={doc.file_path} fileType={doc.file_type} name={t('adv.docs.title')} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Consultation requests CTA — beside documents, not below */}
        <Card>
          <CardContent className="flex h-full flex-col justify-center gap-4 py-5">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Inbox className="size-5" /></span>
              <div>
                <p className="font-medium">{t('adv.nav.consultations')}</p>
                <p className="text-xs text-muted-foreground">{t('adv.dash.pending')}: {n(d?.consultationStats?.pending_count)}</p>
              </div>
            </div>
            <Button asChild variant="outline" className="w-fit">
              <Link href="/advocate/consultations"><Inbox className="size-4" /> {t('adv.dash.viewRequests')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
