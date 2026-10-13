import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLang, pageMetadata, titleWith, makeDescription, absUrl } from '../../../../lib/seo.js';
import { getDictionary } from '../../../../i18n/dictionaries.js';
import { getLessons } from '../../../../lib/api.js';
import { JsonLd } from '../../../../components/JsonLd.jsx';

export function generateMetadata({ params }) {
  if (!isLang(params.lang)) return {};
  const d = getDictionary(params.lang).lessons;
  return pageMetadata({ lang: params.lang, path: '/lessons', title: titleWith(d.title), description: d.description });
}

export default async function LessonsPage({ params }) {
  if (!isLang(params.lang)) notFound();
  const lang = params.lang;
  const d = getDictionary(lang).lessons;
  const result = await getLessons();

  const list = result.ok && result.lessons.length > 0 ? (
    <ul className="mt-6 space-y-4">
      {result.lessons.map((l) => (
        <li key={l.slug} className="rounded-xl border border-sapphire/20 bg-white p-4">
          <h2 className="text-xl font-semibold">
            <Link href={`/${lang}/lessons/${l.slug}`} className="text-sapphire underline">{l.title[lang]}</Link>
          </h2>
        </li>
      ))}
    </ul>
  ) : (
    <p className="mt-6">{result.ok ? d.empty : d.unavailable}</p>
  );

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: getDictionary(lang).brand, item: absUrl(lang, '') },
      { '@type': 'ListItem', position: 2, name: d.h1, item: absUrl(lang, '/lessons') },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <h1 className="text-3xl font-bold text-sapphire">{d.h1}</h1>
      <p className="mt-3">{makeDescription(d.description, 160)}</p>
      {list}
    </>
  );
}
