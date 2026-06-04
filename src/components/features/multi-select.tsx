'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type Opt = { value: string; label: string } | string;

/**
 * Compact multi-select: the trigger shows the chosen values as small chips on a
 * single line and opens an overlay checklist on click. Keeps long option lists
 * (e.g. districts) from making a form grow tall — the overlay scrolls, the page
 * never does.
 */
export function MultiSelect({
  options, value, onChange, placeholder,
}: {
  options: Opt[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const labelFor = (v: string) => opts.find((o) => o.value === v)?.label ?? v;
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background/60 px-3 py-2 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {value.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            value.map((v) => (
              <span key={v} className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-xs">
                {labelFor(v)}
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Remove ${labelFor(v)}`}
                  onClick={(e) => { e.stopPropagation(); toggle(v); }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3" />
                </span>
              </span>
            ))
          )}
          <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-1">
        <div className="max-h-72 overflow-y-auto">
          {opts.map((o) => {
            const active = value.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className={cn('flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent', active && 'font-medium')}
              >
                <span className={cn('grid size-4 shrink-0 place-items-center rounded border', active ? 'border-gold bg-gold/20 text-primary' : 'border-border')}>
                  {active && <Check className="size-3" />}
                </span>
                {o.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
