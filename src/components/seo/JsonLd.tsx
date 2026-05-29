import { website_json_ld } from '@/lib/seo/json-ld';

export default function JsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(website_json_ld) }}
    />
  );
}
