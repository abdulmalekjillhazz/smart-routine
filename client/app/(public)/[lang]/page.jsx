import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLang, pageMetadata, DEFAULT_LANG, BRAND, absUrl, SITE_URL } from '../../../lib/seo.js';
import { getDictionary } from '../../../i18n/dictionaries.js';
import { JsonLd } from '../../../components/JsonLd.jsx';

export function generateMetadata({ params }) {
  if (!isLang(params.lang)) return {};
  const d = getDictionary(params.lang).home;
  return pageMetadata({ lang: params.lang, path: '', title: `${d.title} | ${BRAND}`, description: d.description });
}

export default function HomePage({ params }) {
  if (!isLang(params.lang)) notFound();
  const lang = params.lang;
  const d = getDictionary(lang).home;
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: BRAND,
      url: absUrl(DEFAULT_LANG, ''),
      logo: `${SITE_URL}/icon.svg`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: BRAND,
      url: absUrl(lang, ''),
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web',
      inLanguage: lang === 'bn' ? 'bn' : 'en',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BDT' },
    },
  ];
  return (
    <>
      <JsonLd data={data} />
      <h1 className="text-3xl font-bold text-sapphire">{d.h1}</h1>
      <p className="mt-4 text-lg">{d.lead}</p>
      {/* One primary action (lessons work today) and one secondary link (the app is not built yet). */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Link href={`/${lang}/lessons`} className="min-h-[44px] rounded-lg bg-sapphire px-5 py-3 font-semibold text-paper">{d.ctaLessons}</Link>
        <Link href="/app" className="min-h-[44px] py-3 font-semibold text-sapphire underline">{d.ctaApp}</Link>
      </div>
    </>
  );
}
