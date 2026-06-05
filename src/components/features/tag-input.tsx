'use client';

import * as React from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Toggle a fixed set of options (e.g. practice areas, languages, districts). */
export function ChipToggle({
  options, value, onChange, className,
}: {
  options: { value: string; label: string }[] | string[];
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
}) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {opts.map((o) => {
        const active = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            aria-pressed={active}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              active ? 'border-gold bg-gold/15 text-primary' : 'border-border text-muted-foreground hover:border-gold/40 hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Free-form add/remove tags (e.g. courts). Optional suggestions. */
export function TagInput({
  value, onChange, placeholder, suggestions, className,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
}) {
  const [draft, setDraft] = React.useState('');
  const add = (raw: string) => {
    const v = raw.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft('');
  };
  const remove = (v: string) => onChange(value.filter((x) => x !== v));
  const unused = (suggestions ?? []).filter((s) => !value.includes(s));

  return (
    <div className={cn('space-y-2', className)}>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((v) => (
            <span key={v} className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-sm">
              {v}
              <button type="button" onClick={() => remove(v)} className="text-muted-foreground hover:text-destructive" aria-label={`Remove ${v}`}><X className="size-3.5" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(draft); } }}
          placeholder={placeholder}
        />
        <button type="button" onClick={() => add(draft)} className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-accent" aria-label="Add">
          <Plus className="size-4" />
        </button>
      </div>
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unused.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-gold/40 hover:text-foreground">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
