import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Read-only star rating with optional numeric + count. */
export function RatingStars({
  rating,
  count,
  size = 'sm',
  className,
}: {
  // Backend may send these as numeric strings ("4.5" / "12") — coerce defensively.
  rating: number | string | null;
  count?: number | string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const num = rating == null ? null : Number(rating);
  const value = num == null || Number.isNaN(num) ? 0 : num;
  const reviewCount = count == null ? null : Number(count);
  const dim = size === 'md' ? 'size-4' : 'size-3.5';

  if (num == null || Number.isNaN(num) || reviewCount === 0) {
    return <span className={cn('text-xs text-muted-foreground', className)}>No reviews yet</span>;
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(dim, i <= Math.round(value) ? 'fill-gold text-gold' : 'fill-transparent text-muted-foreground/40')}
            strokeWidth={1.8}
          />
        ))}
      </span>
      <span className="text-xs font-semibold text-foreground">{value.toFixed(1)}</span>
      {reviewCount != null && !Number.isNaN(reviewCount) && (
        <span className="text-xs text-muted-foreground">({reviewCount})</span>
      )}
    </span>
  );
}
