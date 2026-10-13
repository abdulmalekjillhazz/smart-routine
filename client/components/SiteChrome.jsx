import Link from 'next/link';
import { MobileMenu } from './MobileMenu.jsx';

export function Header({ lang, dict }) {
  return (
    <header className="bg-sapphire text-paper">
      <nav aria-label={dict.nav.label} className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 px-4 py-3">
        <Link href={`/${lang}`} className="min-h-[44px] py-2 text-lg font-bold text-gold">{dict.brand}</Link>
        <MobileMenu label={dict.nav.menu} closeLabel={dict.nav.close}>
          <Link href={`/${lang}/lessons`} className="min-h-[44px] py-2">{dict.nav.lessons}</Link>
          <Link href={`/${lang}/about`} className="min-h-[44px] py-2">{dict.nav.about}</Link>
          <Link href={`/${lang}/help`} className="min-h-[44px] py-2">{dict.nav.help}</Link>
          <Link href="/app" className="min-h-[44px] rounded-lg bg-gold px-4 py-2 font-semibold text-ink md:ml-auto">{dict.nav.app}</Link>
        </MobileMenu>
      </nav>
    </header>
  );
}

export function Footer({ lang, dict }) {
  return (
    <footer className="mt-12 border-t border-sapphire/20">
      <div className="mx-auto flex max-w-3xl flex-wrap gap-4 px-4 py-6 text-sm">
        <span className="text-sapphire">{dict.footer.note}</span>
        <Link href={`/${lang}/privacy`} className="min-h-[44px] py-2 text-sapphire underline">{dict.footer.privacy}</Link>
        <Link href={`/${lang}/terms`} className="min-h-[44px] py-2 text-sapphire underline">{dict.footer.terms}</Link>
        <Link href={`/${lang}/help`} className="min-h-[44px] py-2 text-sapphire underline">{dict.footer.help}</Link>
        {dict.draft ? <span className="w-full">{dict.footer.draftNotice}</span> : null}
      </div>
    </footer>
  );
}
