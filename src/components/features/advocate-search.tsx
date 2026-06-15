'use client';

import * as React from 'react';
import { Search, X, MapPin, Scale, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchSuggestion {
  type: 'category' | 'district';
  value: string;
}

/**
 * Directory search box with an instant, keyboard-navigable autocomplete.
 *
 * Two things happen as the user types:
 *  - the free text is reported up via `onChange` (the page debounces it and
 *    sends it to the backend `?q=` for name / bio matching), and
 *  - local suggestions are computed from the known vocabulary (practice-area
 *    categories + districts). Choosing one applies the structured filter
 *    instead of a fuzzy text search — faster and exact.
 *
 * Suggestions are local, so they're instant (no debounce, no request).
 */
export function AdvocateSearch({
  value,
  onChange,
  onSelectSuggestion,
  categories,
  districts,
  placeholder,
  labels,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelectSuggestion: (s: SearchSuggestion) => void;
  categories: string[];
  districts: string[];
  placeholder: string;
  labels: { categories: string; districts: string; clear: string };
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listboxId = React.useId();

  const query = value.trim().toLowerCase();

  const suggestions = React.useMemo<SearchSuggestion[]>(() => {
    if (!query) return [];
    const cat = categories
      .filter((c) => c.toLowerCase().includes(query))
      .map((c) => ({ type: 'category' as const, value: c }));
    const dist = districts
      .filter((d) => d.toLowerCase().includes(query))
      .map((d) => ({ type: 'district' as const, value: d }));
    return [...cat, ...dist].slice(0, 8);
  }, [query, categories, districts]);

  // Close the dropdown when clicking/tapping outside the component.
  React.useEffect(() => {
    function onDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  const showDropdown = open && suggestions.length > 0;

  function choose(s: SearchSuggestion) {
    onSelectSuggestion(s);
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
  }

  function clear() {
    onChange('');
    setOpen(false);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(suggestions[active]);
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setActive(-1); // typing shifts the suggestion list — drop the highlight
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={cn(
          'h-11 w-full rounded-xl border border-input bg-background/60 pl-10 pr-10 text-sm shadow-soft transition-colors',
          'placeholder:text-muted-foreground',
          'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 outline-none',
        )}
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label={labels.clear}
          className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lift"
        >
          {(['category', 'district'] as const).map((groupType) => {
            const items = suggestions.filter((s) => s.type === groupType);
            if (!items.length) return null;
            return (
              <div key={groupType} className="py-0.5">
                <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {groupType === 'category' ? labels.categories : labels.districts}
                </div>
                {items.map((s) => {
                  const idx = suggestions.indexOf(s);
                  const Icon = s.type === 'category' ? Scale : MapPin;
                  const isActive = idx === active;
                  return (
                    <button
                      key={`${s.type}-${s.value}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => choose(s)}
                      className={cn(
                        'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                        isActive ? 'bg-accent text-foreground' : 'text-foreground/90 hover:bg-accent/60',
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{s.value}</span>
                      <CornerDownLeft
                        className={cn(
                          'ml-auto size-3.5 shrink-0 text-muted-foreground transition-opacity',
                          isActive ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
