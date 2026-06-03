import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://legallink.in';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'LegalLink — Free Legal Aid for West Bengal',
    template: '%s | LegalLink',
  },
  description:
    'Describe your legal problem anonymously in English or Bengali. LegalLink AI analyses it, retrieves real Indian statute citations, and connects you with verified Bar Council advocates — completely free.',
  keywords: [
    'legal aid', 'free legal advice', 'West Bengal', 'Bengali legal help',
    'advocate Kolkata', 'citizen rights India', 'BCI advocate', 'law help WB',
    'আইনি সহায়তা', 'বাংলাদেশ আইন', 'পশ্চিমবঙ্গ আইনজীবী',
  ],
  authors: [{ name: 'LegalLink' }],
  creator: 'LegalLink',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    title: 'LegalLink — Free AI-Powered Legal Aid',
    description: 'Anonymous AI legal guidance for citizens of West Bengal. Bilingual (English & Bengali), real statute citations, verified advocates.',
    url: SITE_URL,
    siteName: 'LegalLink',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LegalLink — Free Legal Aid for West Bengal',
    description: 'AI-powered, anonymous, bilingual legal guidance. Connect with verified advocates.',
  },
  alternates: {
    canonical: SITE_URL,
    languages: { 'en-IN': `${SITE_URL}`, 'bn-IN': `${SITE_URL}?lang=bn` },
  },
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
      </head>
      <body>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
