import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'LegalLink — Free Legal Aid for West Bengal',
  description: 'Describe your legal problem anonymously. Our AI analyses it, retrieves relevant statutes and judgments, and connects you with verified advocates — completely free.',
  keywords: 'legal aid, free legal advice, West Bengal, Bengali, advocate, legal help, citizen rights',
  openGraph: {
    title: 'LegalLink — Free Legal Aid',
    description: 'Anonymous AI-powered legal guidance for citizens of West Bengal.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Tiro+Bangla+Sangam&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
