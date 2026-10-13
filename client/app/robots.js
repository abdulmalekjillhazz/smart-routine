import { SITE_URL } from '../lib/seo.js';

// Private areas and the API are excluded. Public pages stay open for crawlers.
export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/app', '/admin', '/api/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
