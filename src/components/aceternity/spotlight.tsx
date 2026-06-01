'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Static gold spotlight cone — sits behind hero headlines for depth.
 */
export function Spotlight({ className, fill = 'var(--glow)' }: { className?: string; fill?: string }) {
  return (
    <svg
      aria-hidden
      className={cn(
        'pointer-events-none absolute z-0 h-[160%] w-[140%] animate-pulse-glow opacity-60 blur-2xl',
        className,
      )}
      viewBox="0 0 3787 2842"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g filter="url(#spotlight-blur)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="1924.71"
          ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill={fill}
          fillOpacity="0.5"
        />
      </g>
      <defs>
        <filter id="spotlight-blur" x="0" y="0" width="3787" height="2842" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="151" />
        </filter>
      </defs>
    </svg>
  );
}

/**
 * Pointer-tracking radial glow — follows the cursor across a surface.
 * Wrap any relative container; place as a sibling above the background.
 */
export function SpotlightCursor({ className, size = 360 }: { className?: string; size?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState({ x: -1000, y: -1000 });
  const [active, setActive] = React.useState(false);

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className={cn('pointer-events-auto absolute inset-0 z-0', className)}
      aria-hidden
    >
      <div
        className="absolute rounded-full transition-opacity duration-300"
        style={{
          left: pos.x - size / 2,
          top: pos.y - size / 2,
          width: size,
          height: size,
          opacity: active ? 1 : 0,
          background: 'radial-gradient(circle, var(--glow), transparent 70%)',
          filter: 'blur(28px)',
        }}
      />
    </div>
  );
}
