'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Card whose border lights up with a gold glow that follows the cursor.
 * Falls back gracefully (just a bordered card) without pointer.
 */
export function GlowCard({
  className,
  contentClassName,
  children,
  ...props
}: React.ComponentProps<'div'> & { contentClassName?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-card p-6 text-card-foreground shadow-soft transition-shadow hover:shadow-lift',
        className,
      )}
      {...props}
    >
      {/* Glow that tracks the pointer */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(360px circle at var(--mx, 50%) var(--my, 0%), color-mix(in srgb, var(--gold) 18%, transparent), transparent 60%)',
        }}
      />
      <div className={cn('relative z-10', contentClassName)}>{children}</div>
    </div>
  );
}
