'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Segmented one-time-code input: a row of individual cells that fill as the
 * user types. Empty cells show a blinking caret when active; filled cells pop
 * and glow. Supports paste, backspace-to-previous, and arrow navigation.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus,
  disabled,
  hasError,
}: {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  hasError?: boolean;
}) {
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);
  const [active, setActive] = React.useState<number | null>(null);

  const digits = React.useMemo(() => {
    const arr = value.replace(/\D/g, '').slice(0, length).split('');
    return Array.from({ length }, (_, i) => arr[i] ?? '');
  }, [value, length]);

  function commit(arr: string[]) {
    onChange(arr.join('').slice(0, length));
  }

  function handleChange(i: number, raw: string) {
    const clean = raw.replace(/\D/g, '');
    if (!clean) return; // deletions handled in keydown
    const arr = digits.slice();
    let j = i;
    for (const ch of clean) {
      if (j >= length) break;
      arr[j] = ch;
      j += 1;
    }
    commit(arr);
    refs.current[Math.min(j, length - 1)]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const arr = digits.slice();
      if (arr[i]) {
        arr[i] = '';
        commit(arr);
      } else if (i > 0) {
        arr[i - 1] = '';
        commit(arr);
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!text) return;
    e.preventDefault();
    commit(text.split(''));
    refs.current[Math.min(text.length, length - 1)]?.focus();
  }

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {digits.map((d, i) => {
        const isActive = active === i;
        const filled = !!d;
        return (
          <div key={i} className="relative">
            <input
              ref={(el) => { refs.current[i] = el; }}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              autoFocus={autoFocus && i === 0}
              maxLength={length}
              disabled={disabled}
              value={d}
              aria-label={`Digit ${i + 1}`}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onFocus={(e) => { setActive(i); e.target.select(); }}
              onBlur={() => setActive((a) => (a === i ? null : a))}
              className={cn(
                'h-14 w-11 rounded-xl border bg-card/50 text-center font-mono text-2xl font-semibold text-foreground caret-transparent outline-none transition-all duration-200 sm:h-16 sm:w-12',
                filled
                  ? 'border-gold/60 bg-gold/10 -translate-y-0.5 shadow-lift'
                  : 'border-border hover:border-gold/40',
                isActive && !hasError && 'border-gold ring-2 ring-gold/30 -translate-y-0.5',
                hasError && 'border-destructive ring-2 ring-destructive/25',
              )}
            />
            {/* Fake caret while the active cell is empty */}
            {isActive && !filled && (
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 w-px -translate-x-1/2 -translate-y-1/2 animate-caret bg-gold"
                style={{ height: '1.6rem' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
