import Link from 'next/link';
import { cn } from '@/lib/utils';

/** LegalLink mark (brand image) + wordmark. */
export function Logo({
  className,
  href = '/',
  showText = true,
  markSize = 'size-10',
  textClassName,
}: {
  className?: string;
  href?: string | null;
  showText?: boolean;
  /** Tailwind size class for the square mark (e.g. 'size-12'). */
  markSize?: string;
  /** Extra classes for the wordmark text (e.g. 'text-2xl'). */
  textClassName?: string;
}) {
  const inner = (
    <span className={cn('group inline-flex items-center gap-2.5', className)}>
      {/* The logo art has a white background, so the tile is just a rounded frame. */}
      <span className={cn('grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-soft ring-1 ring-border transition-transform group-hover:scale-105', markSize)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="LegalLink" className="size-full object-cover" />
      </span>
      {showText && (
        <span className={cn('font-display text-xl font-semibold tracking-tight', textClassName)}>
          Legal<span className="text-gradient-gold">Link</span>
        </span>
      )}
    </span>
  );

  if (href === null) return inner;
  return (
    <Link href={href} aria-label="LegalLink home">
      {inner}
    </Link>
  );
}
