import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/auth/signup', '/auth/advocate-signup'],
        disallow: ['/admin/', '/advocate/', '/chat/', '/matter/', '/matters/'],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://legallink.in'}/sitemap.xml`,
  };
}
