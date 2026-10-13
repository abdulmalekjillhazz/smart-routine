import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLang, isSafeSlug, pageMetadata, titleWith, makeDescription, absUrl } from '../../../../../lib/seo.js';
import { getDictionary } from '../../../../../i18n/dictionaries.js';
import { getLesson, getLessons } from '../../../../../lib/api.js';
import { JsonLd } from '../../../../../components/JsonLd.jsx';

export const revalidate = 300;

// Pre-build the published lessons when the API is reachable. Otherwise pages are built on first request.
export async function generateStaticParams() {
  const result = await getLessons();
  if (!result.ok) return [];
  return result.lessons.flatMap((l) => [{ lang: 'bn', slug: l.slug }, { lang: 'en', slug: l.slug }]);
}

export async function generateMetadata({ params }) {
  if (!isLang(params.lang) || !isSafeSlug(params.slug)) return {};
  const result = await getLesson(params.slug);
  if (!result.ok) {
    // Not published, or temporarily unavailable: never index an error page.
    return { title: titleWith(getDictionary(params.lang).lessons.title), robots: { index: false, follow: true } };
  }
  const lang = params.lang;
  return pageMetadata({
    lang,
    path: `/lessons/${params.slug}`,
    title: titleWith(result.lesson.title[lang]),
    description: makeDescription(result.lesson.body[lang]),
  });
}

export default async function LessonPage({ params }) {
  if (!isLang(params.lang) || !isSafeSlug(params.slug)) notFound();
  const lang = params.lang;
  const d = getDictionary(lang).lessons;
  const result = await getLesson(params.slug);
  if (!result.ok && result.reason === 'not-found') notFound();
  if (!result.ok) return <p className="mt-6">{d.lessonUnavailable}</p>;

  const lesson = result.lesson;
  const paragraphs = lesson.body[lang].split('\n').filter(Boolean);
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: lesson.title[lang],
    description: makeDescription(lesson.body[lang]),
    inLanguage: lang === 'bn' ? 'bn' : 'en',
    url: absUrl(lang, `/lessons/${params.slug}`),
    datePublished: lesson.publishedAt,
  };
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: getDictionary(lang).brand, item: absUrl(lang, '') },
      { '@type': 'ListItem', position: 2, name: d.back, item: absUrl(lang, '/lessons') },
      { '@type': 'ListItem', position: 3, name: lesson.title[lang], item: absUrl(lang, `/lessons/${params.slug}`) },
    ],
  };

  return (
    <article>
      <JsonLd data={[data, breadcrumbs]} />
      <p className="text-sm"><Link href={`/${lang}/lessons`} className="text-sapphire underline">{d.back}</Link></p>
      <h1 className="mt-3 text-3xl font-bold text-sapphire">{lesson.title[lang]}</h1>
      {lesson.media?.url ? (
        <img src={lesson.media.url} alt={lesson.title[lang]} loading="lazy" className="mt-4 w-full rounded-xl" />
      ) : null}
      <div className="mt-4 space-y-3">
        {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </div>
      {lesson.vocabulary?.length ? (
        <section className="mt-6">
          <h2 className="text-xl font-semibold">{d.vocabulary}</h2>
          <dl className="mt-2 space-y-2">
            {lesson.vocabulary.map((v) => (
              <div key={v.word}>
                <dt className="font-semibold">{v.word}</dt>
                <dd>{v.meaning[lang]}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      <p className="mt-6">{d.quizCta} <Link href="/app" className="text-sapphire underline">/app</Link></p>
    </article>
  );
}
