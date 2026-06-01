import Link from 'next/link';
import { Logo } from './logo';

const COLUMNS = [
  {
    title: 'Platform',
    links: [
      { href: '/advocates', label: 'Find Advocates' },
      { href: '/#how-it-works', label: 'How it works' },
      { href: '/auth/advocate-signup', label: 'For Advocates' },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: '/auth/login', label: 'Log in' },
      { href: '/auth/signup', label: 'Get started' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              AI-powered, anonymous, bilingual legal guidance for the citizens of West Bengal —
              connecting you with Bar Council–verified advocates.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-foreground/80 transition-colors hover:text-primary">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {2026} LegalLink. General legal information only — not legal advice.</p>
          <p>Built for West Bengal · English &amp; বাংলা</p>
        </div>
      </div>
    </footer>
  );
}
