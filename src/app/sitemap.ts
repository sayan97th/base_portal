import { MetadataRoute } from 'next';

const base_url = 'https://portal.basesearchmarketing.com';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: base_url,
      lastModified: new Date('2026-03-18T18:52:56+00:00'),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
