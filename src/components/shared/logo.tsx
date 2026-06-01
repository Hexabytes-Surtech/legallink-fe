import Link from 'next/link';
import { Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

/** LegalLink wordmark + scales-of-justice mark. */
export function Logo({
  className,
  href = '/',
  showText = true,
}: {
  className?: string;
  href?: string | null;
  showText?: boolean;
}) {
  const inner = (
    <span className={cn('group inline-flex items-center gap-2.5', className)}>
      <span className="relative grid size-9 place-items-center rounded-xl bg-secondary text-gold shadow-soft ring-1 ring-gold/30 transition-transform group-hover:scale-105">
        <Scale className="size-5" strokeWidth={2.2} />
        <span className="absolute inset-0 rounded-xl bg-gold/10 opacity-0 blur transition-opacity group-hover:opacity-100" />
      </span>
      {showText && (
        <span className="font-display text-xl font-semibold tracking-tight">
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
