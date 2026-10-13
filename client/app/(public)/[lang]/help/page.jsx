import { notFound } from 'next/navigation';
import { isLang, pageMetadata, titleWith } from '../../../../lib/seo.js';
import { getDictionary } from '../../../../i18n/dictionaries.js';

export function generateMetadata({ params }) {
  if (!isLang(params.lang)) return {};
  const d = getDictionary(params.lang).help;
  return pageMetadata({ lang: params.lang, path: '/help', title: titleWith(d.title), description: d.description });
}

export default function Page({ params }) {
  if (!isLang(params.lang)) notFound();
  const d = getDictionary(params.lang).help;
  return (
    <>
      <h1 className="text-3xl font-bold text-sapphire">{d.h1}</h1>
      {d.body.map((p, i) => <p key={i} className="mt-4">{p}</p>)}
      <p className="mt-6">
        {process.env.NEXT_PUBLIC_SUPPORT_EMAIL
          ? <a className="text-sapphire underline" href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`}>{process.env.NEXT_PUBLIC_SUPPORT_EMAIL}</a>
          : (params.lang === 'bn' ? 'সহায়তার ইমেইল ঠিকানা প্রকাশের আগে এখানে যোগ করা হবে।' : 'The support email address will be added before launch.')}
      </p>
    </>
  );
}
