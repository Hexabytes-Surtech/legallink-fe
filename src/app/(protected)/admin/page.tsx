'use client';

import Link from 'next/link';
import { BadgeCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { PendingAdvocate, FlaggedMessage } from '@/types';

export default function AdminOverviewPage() {
  const { t } = useLanguage();
  const pendingQ = useQuery<PendingAdvocate[]>(() => api.get('/admin/advocates/pending'), []);
  const flaggedQ = useQuery<FlaggedMessage[]>(() => api.get('/admin/messages/flagged'), []);

  const cards = [
    {
      icon: BadgeCheck, tone: 'text-success', href: '/admin/advocates',
      label: t('adm.overview.pending'), q: pendingQ, count: pendingQ.data?.length ?? 0,
    },
    {
      icon: ShieldAlert, tone: 'text-warning', href: '/admin/messages',
      label: t('adm.overview.flagged'), q: flaggedQ, count: flaggedQ.data?.length ?? 0,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t('adm.title')}</h1>
      <p className="mt-1 text-muted-foreground">{t('adm.subtitle')}</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.href}>
              <CardContent className="py-6">
                <Icon className={`size-6 ${c.tone}`} />
                {c.q.loading ? (
                  <Skeleton className="mt-3 h-10 w-16" />
                ) : (
                  <p className="mt-3 font-display text-4xl font-semibold">{c.count}</p>
                )}
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href={c.href}>{t('adm.overview.review')} <ArrowRight className="size-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
