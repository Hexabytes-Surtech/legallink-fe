import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';
import { Pwa } from '@/components/shared/pwa';

// The one host every canonical/sitemap/OG URL is built from. Set
// NEXT_PUBLIC_SITE_URL in the deployment to override (e.g. when you move to the
// legallink.in apex). The default MUST match the host actually serving the
// site, otherwise the canonical tag points at a different domain and search
// engines de-index the live pages.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://legallink.hexabytes.tech';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'LegalLink — Free AI Legal Help in West Bengal',
    template: '%s | LegalLink',
  },
  description:
    'Free, anonymous AI legal help in English & Bengali — real Indian statute citations plus Bar-verified West Bengal advocates. Completely free.',
  keywords: [
    'free legal advice online india', 'ai legal advice india', 'free legal aid west bengal',
    'free legal aid kolkata', 'legal help ai india', 'online legal help bengali',
    'advocate consultation kolkata', 'bengali legal advice', 'legallink west bengal',
    'আইনি সহায়তা', 'পশ্চিমবঙ্গ আইনজীবী',
  ],
  authors: [{ name: 'LegalLink' }],
  creator: 'LegalLink',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    title: 'LegalLink — Free AI Legal Help for West Bengal',
    description: 'Anonymous AI legal guidance for West Bengal. Bilingual (English & Bengali), real Indian statute citations, Bar-verified advocates — free.',
    url: SITE_URL,
    siteName: 'LegalLink',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LegalLink — Free AI Legal Help for West Bengal',
    description: 'AI-powered, anonymous, bilingual legal guidance. Connect with verified advocates — free.',
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      'en-IN': SITE_URL,
      'bn-IN': `${SITE_URL}?lang=bn`,
      'x-default': SITE_URL,
    },
  },
  applicationName: 'LegalLink',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LegalLink',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0a78c0' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0d1a' },
  ],
};

// Structured data so Google resolves "LegalLink" to OUR brand entity (there are
// several same-name orgs abroad) and can show rich results. Add real profile
// URLs to `sameAs` as you create them (LinkedIn, Instagram, Play Store, X) — it
// is the strongest signal for owning the brand SERP.
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'LegalLink',
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      description:
        'Free, AI-powered, bilingual (English & Bengali) legal-aid platform for the citizens of West Bengal, India.',
      areaServed: { '@type': 'AdministrativeArea', name: 'West Bengal, India' },
      sameAs: [],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'LegalLink',
      inLanguage: ['en-IN', 'bn-IN'],
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'LegalService',
      '@id': `${SITE_URL}/#legalservice`,
      name: 'LegalLink — Free Legal Aid for West Bengal',
      url: SITE_URL,
      description:
        'Anonymous AI legal guidance with real Indian statute citations, plus connections to Bar Council–verified advocates in West Bengal. Completely free.',
      areaServed: { '@type': 'AdministrativeArea', name: 'West Bengal, India' },
      availableLanguage: ['English', 'Bengali'],
      provider: { '@id': `${SITE_URL}/#organization` },
      priceRange: 'Free',
      serviceType: 'Free legal aid and AI legal information',
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Tiro+Bangla+Sangam&display=swap"
          rel="stylesheet"
        />
        <meta name="format-detection" content="telephone=no" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body>
        <Providers>
          {children}
          <Toaster />
          <Pwa />
        </Providers>
      </body>
    </html>
  );
}
