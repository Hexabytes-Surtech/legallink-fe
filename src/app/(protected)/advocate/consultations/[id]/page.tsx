'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Check, X, MessageSquare, Loader2, FileText } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { useQuery, useMutation } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { AiBrief, AiBriefSkeleton } from '@/components/features/ai-brief';
import { displayPracticeArea } from '@/components/features/advocate-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import type { AdvocateConsultation, MatterDetail } from '@/types';

export default function AdvocateConsultationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const q = useQuery<AdvocateConsultation>(() => api.get(`/advocate/consultations/${id}`), [id]);
  const c = q.data;

  const acceptM = useMutation(() => api.put(`/advocate/consultations/${id}`, { action: 'accept' }));
  const declineM = useMutation(() => api.put(`/advocate/consultations/${id}`, { action: 'decline' }));

  async function run(fn: () => Promise<unknown>, msg: string) {
    try { await fn(); toast.success(msg); q.refetch(); }
    catch (err) { toast.error(err instanceof ApiError ? err.first : t('shared.error')); }
  }

  const pseudoMatter: MatterDetail | null = c
    ? {
        matterId: c.matter_id ?? id,
        status: 'brief_generated',
        query: c.query_text,
        language: c.query_language,
        createdAt: c.requested_at,
        aiResponse: c.brief_json ?? null,
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/advocate/consultations" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {t('adv.consult.title')}
      </Link>

      {q.loading && !c ? (
        <div className="mt-6 space-y-5"><AiBriefSkeleton /></div>
      ) : !c ? (
        <div className="mt-6"><EmptyState icon={FileText} title={t('shared.error')} /></div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={c.status === 'accepted' ? 'success' : c.status === 'pending' ? 'warning' : 'muted'} className="capitalize">{c.status}</Badge>
            {c.classification?.matterType && <Badge variant="gold">{displayPracticeArea(c.classification.matterType)}</Badge>}
            <span className="text-sm text-muted-foreground">{t('adv.consult.from')} {c.citizen_name || 'Citizen'}</span>
          </div>

          {c.citizen_note && (
            <Card>
              <CardHeader><CardTitle className="text-base">{t('adv.consult.note')}</CardTitle></CardHeader>
              <CardContent><p className="text-sm leading-relaxed text-foreground/90">{c.citizen_note}</p></CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {c.status === 'pending' && (
              <>
                <Button onClick={() => run(() => acceptM.mutate(), 'Accepted')} disabled={acceptM.loading}>
                  {acceptM.loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} {t('adv.consult.accept')}
                </Button>
                <Button variant="ghost" className="text-destructive" onClick={() => run(() => declineM.mutate(), 'Declined')} disabled={declineM.loading}>
                  <X className="size-4" /> {t('adv.consult.decline')}
                </Button>
              </>
            )}
            {c.status === 'accepted' && (
              <Button asChild><Link href={`/advocate/messages/${id}`}><MessageSquare className="size-4" /> {t('adv.consult.openChat')}</Link></Button>
            )}
          </div>

          {/* AI brief */}
          <div>
            <h2 className="mb-3 font-display text-lg font-semibold">{t('adv.consult.brief')}</h2>
            {pseudoMatter && <AiBrief matter={pseudoMatter} />}
          </div>
        </div>
      )}
    </div>
  );
}
