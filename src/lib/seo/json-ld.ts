const base_url = 'https://portal.basesearchmarketing.com';
const base_logo_url = `${base_url}/images/logo/base-logo.png`;
const base_og_image_url = `${base_url}/images/seo/base-og.png`;

export const website_json_ld = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${base_url}/`,
      url: `${base_url}/`,
      name: 'BASE Search Marketing | A Link Building and Content Agency',
      isPartOf: { '@id': `${base_url}/#website` },
      about: { '@id': `${base_url}/#organization` },
      primaryImageOfPage: { '@id': `${base_url}/#primaryimage` },
      image: { '@id': `${base_url}/#primaryimage` },
      thumbnailUrl: base_og_image_url,
      datePublished: '2022-07-08T16:01:44+00:00',
      dateModified: '2026-03-18T18:52:56+00:00',
      description:
        'BASE Search Marketing offers links and content services for SEOs who know what they need, and full SEO packages for marketers who want extra support.',
      breadcrumb: { '@id': `${base_url}/#breadcrumb` },
      inLanguage: 'en-US',
      potentialAction: [{ '@type': 'ReadAction', target: [`${base_url}/`] }],
    },
    {
      '@type': 'ImageObject',
      inLanguage: 'en-US',
      '@id': `${base_url}/#primaryimage`,
      url: base_og_image_url,
      contentUrl: base_og_image_url,
      width: 1920,
      height: 1080,
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${base_url}/#breadcrumb`,
      itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home' }],
    },
    {
      '@type': 'WebSite',
      '@id': `${base_url}/#website`,
      url: `${base_url}/`,
      name: 'BASE Search Marketing',
      description: 'Affordable, Effective SEO for Small Businesses',
      publisher: { '@id': `${base_url}/#organization` },
      potentialAction: [
        {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${base_url}/?s={search_term_string}`,
          },
          'query-input': {
            '@type': 'PropertyValueSpecification',
            valueRequired: true,
            valueName: 'search_term_string',
          },
        },
      ],
      inLanguage: 'en-US',
    },
    {
      '@type': 'Organization',
      '@id': `${base_url}/#organization`,
      name: 'BASE Search Marketing',
      url: `${base_url}/`,
      logo: {
        '@type': 'ImageObject',
        inLanguage: 'en-US',
        '@id': `${base_url}/#/schema/logo/image/`,
        url: base_logo_url,
        contentUrl: base_logo_url,
        width: 875,
        height: 355,
        caption: 'BASE Search Marketing',
      },
      image: { '@id': `${base_url}/#/schema/logo/image/` },
    },
  ],
};
