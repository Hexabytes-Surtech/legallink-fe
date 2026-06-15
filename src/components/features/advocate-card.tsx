import Link from 'next/link';
import { MapPin, Languages as LangIcon, BadgeCheck } from 'lucide-react';
import { GlowCard } from '@/components/aceternity/glow-card';
import { AvatarFallback } from '@/components/ui/avatar';
import { ViewableAvatar } from '@/components/shared/viewable-avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RatingStars } from './rating-stars';
import type { AdvocateCardData } from '@/types';
import { cn } from '@/lib/utils';
// Practice-area formatting now lives in one place (lib/practice-areas). Re-exported
// here so existing importers of `displayPracticeArea` from this module keep working.
import { uniquePracticeAreaLabels } from '@/lib/practice-areas';
export { displayPracticeArea } from '@/lib/practice-areas';

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || 'A';
}

function langLabel(l: string) {
  return l === 'bn' ? 'বাংলা' : l === 'en' ? 'English' : l === 'hi' ? 'हिन्दी' : l;
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
  // Defensive defaults: never let a missing array crash the whole page.
  const practiceAreas = advocate.practice_areas ?? [];
  const districts = advocate.districts ?? [];
  const languages = advocate.languages ?? [];
  const verified = advocate.verification_status === 'verified';

  return (
    <GlowCard className={cn('h-full p-5 sm:p-6', className)} contentClassName="flex h-full flex-col gap-4">
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <ViewableAvatar
            src={advocate.avatar_url}
            name={advocate.name}
            className="size-14 shrink-0 ring-1 ring-border"
            fallback={<AvatarFallback className="text-base">{initials(advocate.name)}</AvatarFallback>}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Link href={profileHref} className="truncate font-display text-lg font-semibold leading-tight hover:text-primary">
                {advocate.name}
              </Link>
              {verified && <BadgeCheck className="size-[18px] shrink-0 text-success" aria-label="Verified" />}
            </div>
            <div className="mt-1">
              <RatingStars rating={advocate.rating} count={advocate.rating_count} />
            </div>
            {advocate.state_bar && (
              <p className="mt-1 truncate text-xs text-muted-foreground">{advocate.state_bar}</p>
            )}
          </div>
        </div>

        {/* Bio */}
        {advocate.bio && (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{advocate.bio}</p>
        )}

        {/* Practice areas */}
        {practiceAreas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {uniquePracticeAreaLabels(practiceAreas).slice(0, 5).map((label) => (
              <Badge key={label} variant="gold">{label}</Badge>
            ))}
          </div>
        )}

        {/* Meta — pinned to the bottom so cards line up */}
        <div className="mt-auto flex flex-col gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          {districts.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{districts.slice(0, 4).join(', ')}</span>
            </span>
          )}
          {languages.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <LangIcon className="size-3.5 shrink-0" />
              <span className="truncate">{languages.map(langLabel).join(', ')}</span>
            </span>
          )}
        </div>

        {action && <div className="flex items-center gap-2">{action}</div>}
    </GlowCard>
  );
}

export function AdvocateCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex items-start gap-3.5">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-2 h-9 w-full rounded-lg" />
    </div>
  );
}
