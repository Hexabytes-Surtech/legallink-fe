'use client';

import * as React from 'react';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api/client';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { FeedbackCreateResponse } from '@/types';
import { cn } from '@/lib/utils';

export function FeedbackDialog({
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
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [comment, setComment] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    if (rating < 1) return;
    setBusy(true);
    try {
      await api.post<FeedbackCreateResponse>(`/consultations/${consultationId}/feedback`, {
        rating,
        comment: comment.trim() || undefined,
      });
      toast.success(t('feedback.success'));
      setOpen(false);
      onDone?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.first : t('intake.error.generic'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setRating(0); setComment(''); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('feedback.title')}</DialogTitle>
          <DialogDescription>{t('feedback.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>{t('feedback.rating')}</Label>
          <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                onMouseEnter={() => setHover(i)}
                aria-label={`${i} star${i > 1 ? 's' : ''}`}
                className="rounded p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Star className={cn('size-8 transition-colors', i <= (hover || rating) ? 'fill-gold text-gold' : 'fill-transparent text-muted-foreground/40')} strokeWidth={1.6} />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fb-comment">{t('feedback.comment')}</Label>
          <Textarea
            id="fb-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            placeholder={t('feedback.commentPlaceholder')}
            className="min-h-24"
          />
          <p className="text-right text-xs text-muted-foreground">{comment.length}/500</p>
        </div>

        <Button size="lg" className="w-full" disabled={rating < 1 || busy} onClick={submit}>
          {busy ? <><Loader2 className="size-4 animate-spin" />…</> : t('feedback.submit')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
