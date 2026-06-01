import Link from 'next/link';
import { MapPin, Languages as LangIcon } from 'lucide-react';
import { GlowCard } from '@/components/aceternity/glow-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { VerificationBadge } from '@/components/shared/verification-badge';
import { RatingStars } from './rating-stars';
import type { AdvocateCardData } from '@/types';
import { cn } from '@/lib/utils';

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || 'A';
}

export function AdvocateCard({
  advocate,
  href,
  action,
  className,
}: {
  advocate: AdvocateCardData;
  href?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const profileHref = href ?? `/advocates/${advocate.id}`;

  return (
    <GlowCard className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-start gap-3.5">
        <Avatar className="size-12 ring-1 ring-border">
          {advocate.avatar_url && <AvatarImage src={advocate.avatar_url} alt="" />}
          <AvatarFallback>{initials(advocate.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={profileHref} className="truncate font-display text-base font-semibold hover:text-primary">
              {advocate.name}
            </Link>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <VerificationBadge status={advocate.verification_status} />
            <RatingStars rating={advocate.rating} count={advocate.rating_count} />
          </div>
        </div>
      </div>

      {advocate.bio && <p className="line-clamp-2 text-sm text-muted-foreground">{advocate.bio}</p>}

      <div className="flex flex-wrap gap-1.5">
        {advocate.practice_areas.slice(0, 4).map((a) => (
          <Badge key={a} variant="gold">{a}</Badge>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-1.5 text-xs text-muted-foreground">
        {advocate.districts.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" /> {advocate.districts.slice(0, 3).join(', ')}
          </span>
        )}
        {advocate.languages.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <LangIcon className="size-3.5" /> {advocate.languages.map((l) => (l === 'bn' ? 'বাংলা' : l === 'en' ? 'English' : l)).join(', ')}
          </span>
        )}
      </div>

      {action && <div className="flex items-center gap-2 pt-1">{action}</div>}
    </GlowCard>
  );
}

export function AdvocateCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-start gap-3.5">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}
