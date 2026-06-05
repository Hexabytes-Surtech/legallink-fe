'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Ambient aurora backdrop — animated gold/navy light blooms behind content.
 * Tasteful in both themes (stronger glow in dark, soft wash in light).
 */
export function AuroraBackground({
  className,
  children,
  showRadialGradient = true,
}: {
  className?: string;
  children?: React.ReactNode;
  showRadialGradient?: boolean;
}) {
  return (
    <div className={cn('relative isolate overflow-hidden', className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Gold bloom */}
        <div className="animate-aurora absolute -left-[10%] top-[-20%] size-[55vw] rounded-full bg-[radial-gradient(circle_at_center,var(--glow),transparent_60%)] blur-3xl opacity-80" />
        {/* Wine bloom */}
        <div
          className="animate-aurora absolute right-[-12%] top-[8%] size-[48vw] rounded-full blur-3xl opacity-50"
          style={{
            background:
              'radial-gradient(circle at center, color-mix(in srgb, var(--wine) 45%, transparent), transparent 62%)',
            animationDelay: '-6s',
          }}
        />
        {/* Cool navy bloom */}
        <div
          className="animate-aurora absolute bottom-[-25%] left-[25%] size-[50vw] rounded-full blur-3xl opacity-40"
          style={{
            background:
              'radial-gradient(circle at center, color-mix(in srgb, var(--info) 40%, transparent), transparent 60%)',
            animationDelay: '-12s',
          }}
        />
        {showRadialGradient && (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,var(--background)_72%)]" />
        )}
      </div>
      {children}
    </div>
  );
}
