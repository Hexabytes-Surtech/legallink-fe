import type { MetadataRoute } from 'next';

// Web App Manifest — makes LegalLink installable as a PWA on mobile & desktop.
// Next.js serves this at /manifest.webmanifest and auto-links it in <head>.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LegalLink — Free Legal Aid',
    short_name: 'LegalLink',
    description:
      'AI-powered, anonymous, bilingual legal guidance for West Bengal. Get real statute citations and connect with verified advocates — free.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#0a78c0',
    categories: ['legal', 'productivity', 'utilities'],
    lang: 'en-IN',
    dir: 'ltr',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
