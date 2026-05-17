import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/session/', '/api/', '/dev/'],
      },
    ],
    sitemap: 'https://ehr.life/sitemap.xml',
    host: 'https://ehr.life',
  };
}
