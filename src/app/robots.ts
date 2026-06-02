import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/auth/signup', '/auth/advocate-signup'],
        disallow: ['/admin/', '/advocate/', '/advocates/', '/chat/', '/matter/', '/matters/', '/dashboard/', '/profile/', '/settings/'],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://legallink.in'}/sitemap.xml`,
  };
}
