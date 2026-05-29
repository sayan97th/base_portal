import { MetadataRoute } from 'next';

const base_url = 'https://portal.basesearchmarketing.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${base_url}/sitemap.xml`,
    host: base_url,
  };
}
