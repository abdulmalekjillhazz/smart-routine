import { notFound } from 'next/navigation';
import '@fontsource/noto-sans-bengali/400.css';
import '@fontsource/noto-sans-bengali/600.css';
import '@fontsource/noto-sans-bengali/700.css';
import { LANGS, isLang } from '../../../lib/seo.js';
import { getDictionary } from '../../../i18n/dictionaries.js';
import { Header, Footer } from '../../../components/SiteChrome.jsx';
import '../../globals.css';

// The Bangla font is served from this site (see the @fontsource imports above), never from a third party.
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export default function PublicLayout({ children, params }) {
  if (!isLang(params.lang)) notFound();
  const lang = params.lang;
  const dict = getDictionary(lang);
  return (
    <html lang={lang}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:p-2">{lang === 'bn' ? 'মূল বিষয়বস্তুতে যান' : 'Skip to content'}</a>
        <Header lang={lang} dict={dict} />
        <main id="main" className="mx-auto max-w-3xl px-4 py-8">{children}</main>
        <Footer lang={lang} dict={dict} />
      </body>
    </html>
  );
}
