import { jsonLd } from '../lib/seo.js';

// Structured data for search engines. Rendered on the server as plain JSON.
export function JsonLd({ data }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}
