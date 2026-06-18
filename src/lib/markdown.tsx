'use client';

/**
 * Tiny dependency-free Markdown renderer.
 * ---------------------------------------------------------------------------
 * The AI layer streams GitHub-flavored Markdown (e.g. **bold** statute names,
 * `-` bullet steps, short paragraphs). Rendering it as raw text made the chat
 * look like a flat .txt file, so this parses the small subset the model emits
 * and renders it with the app's design tokens.
 *
 * Why hand-rolled (vs react-markdown): this is a Tailwind v4 / React 19 / Next
 * 16 app with no markdown lib and no typography plugin. A ~150-line renderer
 * avoids an install on a bleeding-edge stack, styles to our tokens directly,
 * and degrades gracefully on PARTIAL markdown mid-stream (an unclosed `**`
 * simply renders literally until its closer streams in).
 *
 * Block grammar: headings (#..######), unordered lists (-, *, +, •), ordered
 * lists (1. / 1)), blockquotes (>), and paragraphs (blank-line separated;
 * single newlines become <br/>). Inline: **bold**, *italic*, `code`,
 * [text](url). Anything unrecognised falls through as plain text.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

/** A soft blinking caret shown at the tail of streaming text. */
export function StreamCaret() {
  return (
    <span
      className="ml-0.5 inline-block h-[1em] w-[2px] -translate-y-[1px] animate-pulse rounded-full bg-gold align-middle"
      aria-hidden
    />
  );
}

// ── inline formatting ──────────────────────────────────────────────────────
// Non-global regexes (lastIndex stays 0): exec() always returns the FIRST match.
// We scan all rules each pass and take the earliest match, so order only breaks
// index ties — keep `code` and `**bold**` before `*italic*`.
const INLINE_RULES: { re: RegExp; node: (m: RegExpExecArray, key: string) => React.ReactNode }[] = [
  {
    re: /`([^`]+?)`/,
    node: (m, k) => (
      <code key={k} className="rounded bg-foreground/[0.07] px-1 py-0.5 font-mono text-[0.85em] text-foreground">
        {m[1]}
      </code>
    ),
  },
  {
    re: /\*\*([^*]+?)\*\*/,
    node: (m, k) => <strong key={k} className="font-semibold text-foreground">{renderInline(m[1], k)}</strong>,
  },
  {
    re: /\*([^*\s][^*]*?)\*/,
    node: (m, k) => <em key={k} className="italic">{renderInline(m[1], k)}</em>,
  },
  {
    re: /\[([^\]]+?)\]\((https?:\/\/[^)\s]+)\)/,
    node: (m, k) => (
      <a
        key={k}
        href={m[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-gold underline underline-offset-2 hover:text-gold/80 break-words"
      >
        {m[1]}
      </a>
    ),
  },
];

// A retrieved source the model can cite inline as [1], [2], … — verifiable law,
// the thing a generic chatbot can't do. Structurally a subset of the chat Source.
export type CiteSource = { url?: string | null; citation?: string; section?: string | null };

// Bare [n] or [n, m, …] markers (NOT followed by "(" — that's a markdown link)
// become one chip per number.
const CITE_RE = /\[(\d{1,2}(?:\s*,\s*\d{1,2})*)\](?!\()/;

/** A small clickable superscript citation chip linking to the real source. */
function CiteChip({ n, source }: { n: number; source: CiteSource }) {
  const cls =
    'ml-0.5 inline-flex min-w-[1.15em] items-center justify-center rounded-[0.35em] bg-gold/15 px-[0.3em] align-super text-[0.62em] font-bold leading-[1.5] text-gold no-underline transition-colors hover:bg-gold/30';
  return source.url ? (
    <a href={source.url} target="_blank" rel="noopener noreferrer" title={source.citation ?? `Source ${n}`} className={cls}>
      {n}
    </a>
  ) : (
    <span className={cls} title={source.citation ?? `Source ${n}`}>{n}</span>
  );
}

function renderInline(text: string, keyPrefix: string, sources?: CiteSource[] | null): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let rest = text;
  let n = 0;
  while (rest.length) {
    let best: { idx: number; len: number; node: React.ReactNode } | null = null;
    for (const rule of INLINE_RULES) {
      const m = rule.re.exec(rest);
      if (m && (best === null || m.index < best.idx)) {
        best = { idx: m.index, len: m[0].length, node: rule.node(m, `${keyPrefix}-${n}`) };
      }
    }
    // Citation chips need the resolved source list; only render numbers that exist.
    if (sources && sources.length) {
      const cm = CITE_RE.exec(rest);
      if (cm) {
        const nums = cm[1]
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((x) => x >= 1 && !!sources[x - 1]);
        if (nums.length && (best === null || cm.index < best.idx)) {
          best = {
            idx: cm.index,
            len: cm[0].length,
            node: (
              <React.Fragment key={`${keyPrefix}-cg${n}`}>
                {nums.map((num, j) => <CiteChip key={j} n={num} source={sources[num - 1]} />)}
              </React.Fragment>
            ),
          };
        }
      }
    }
    if (!best) {
      out.push(rest);
      break;
    }
    if (best.idx > 0) out.push(rest.slice(0, best.idx));
    out.push(best.node);
    rest = rest.slice(best.idx + best.len);
    n++;
  }
  return out;
}

// ── block parsing ──────────────────────────────────────────────────────────
type Block =
  | { k: 'h'; level: number; text: string }
  | { k: 'ul'; items: string[] }
  | { k: 'ol'; items: string[] }
  | { k: 'quote'; text: string }
  | { k: 'p'; lines: string[] };

const RE_H = /^(#{1,6})\s+(.*)$/;
const RE_UL = /^\s*[-*+•]\s+/;
const RE_OL = /^\s*\d+[.)]\s+/;
const RE_QUOTE = /^\s*>\s?/;

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }

    const h = RE_H.exec(line);
    if (h) { blocks.push({ k: 'h', level: h[1].length, text: h[2] }); i++; continue; }

    if (RE_QUOTE.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && RE_QUOTE.test(lines[i])) { buf.push(lines[i].replace(RE_QUOTE, '')); i++; }
      blocks.push({ k: 'quote', text: buf.join(' ') });
      continue;
    }
    if (RE_UL.test(line)) {
      const items: string[] = [];
      while (i < lines.length && RE_UL.test(lines[i])) { items.push(lines[i].replace(RE_UL, '')); i++; }
      blocks.push({ k: 'ul', items });
      continue;
    }
    if (RE_OL.test(line)) {
      const items: string[] = [];
      while (i < lines.length && RE_OL.test(lines[i])) { items.push(lines[i].replace(RE_OL, '')); i++; }
      blocks.push({ k: 'ol', items });
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length && lines[i].trim() !== '' &&
      !RE_H.test(lines[i]) && !RE_UL.test(lines[i]) && !RE_OL.test(lines[i]) && !RE_QUOTE.test(lines[i])
    ) {
      para.push(lines[i]); i++;
    }
    blocks.push({ k: 'p', lines: para });
  }
  return blocks;
}

/**
 * Render a Markdown string as styled React nodes.
 * `streaming` appends a caret; `sources` turns inline [n] markers into clickable
 * citation chips (Perplexity-style verifiable law).
 */
export function Markdown({
  text, className, streaming = false, sources,
}: { text: string | null | undefined; className?: string; streaming?: boolean; sources?: CiteSource[] | null }) {
  const blocks = React.useMemo(() => parseBlocks(text || ''), [text]);
  return (
    <div className={cn('space-y-2.5 text-sm leading-relaxed text-foreground/90', className)}>
      {blocks.map((b, i) => {
        const key = `b${i}`;
        // Caret only on the trailing text-like block (valid HTML inside <p>/<blockquote>).
        const caret = streaming && i === blocks.length - 1;
        if (b.k === 'h') {
          return (
            <p key={key} className={cn('font-display font-semibold text-foreground', b.level <= 1 ? 'text-base' : 'text-sm')}>
              {renderInline(b.text, key, sources)}{caret && <StreamCaret />}
            </p>
          );
        }
        if (b.k === 'quote') {
          return (
            <blockquote key={key} className="border-l-2 border-gold/40 pl-3 italic text-muted-foreground">
              {renderInline(b.text, key, sources)}{caret && <StreamCaret />}
            </blockquote>
          );
        }
        if (b.k === 'ul') {
          return (
            <ul key={key} className="space-y-1">
              {b.items.map((it, n) => (
                <li key={n} className="flex gap-2">
                  <span className="mt-[0.5rem] size-1 shrink-0 rounded-full bg-gold/60" aria-hidden />
                  <span>{renderInline(it, `${key}-${n}`, sources)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (b.k === 'ol') {
          return (
            <ol key={key} className="space-y-1">
              {b.items.map((it, n) => (
                <li key={n} className="flex gap-2">
                  <span className="shrink-0 font-semibold tabular-nums text-gold">{n + 1}.</span>
                  <span>{renderInline(it, `${key}-${n}`, sources)}</span>
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={key}>
            {b.lines.map((l, n) => (
              <React.Fragment key={n}>
                {n > 0 && <br />}
                {renderInline(l, `${key}-${n}`, sources)}
              </React.Fragment>
            ))}
            {caret && <StreamCaret />}
          </p>
        );
      })}
    </div>
  );
}

/** Inline-only Markdown (no block wrapper) — for list items / single-line strings. */
export function MarkdownInline({ text, sources }: { text: string | null | undefined; sources?: CiteSource[] | null }) {
  return <>{renderInline(text || '', 'i', sources)}</>;
}
