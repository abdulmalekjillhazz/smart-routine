import { notFound } from 'next/navigation';
import { isLang, pageMetadata, titleWith } from '../../../../lib/seo.js';
import { getDictionary } from '../../../../i18n/dictionaries.js';

export function generateMetadata({ params }) {
  if (!isLang(params.lang)) return {};
  const d = getDictionary(params.lang).terms;
  return pageMetadata({ lang: params.lang, path: '/terms', title: titleWith(d.title), description: d.description });
}

export default function Page({ params }) {
  if (!isLang(params.lang)) notFound();
  const d = getDictionary(params.lang).terms;
  return (
    <>
      <h1 className="text-3xl font-bold text-sapphire">{d.h1}</h1>
      {d.body.map((p, i) => <p key={i} className="mt-4">{p}</p>)}
    </>
  );
}
