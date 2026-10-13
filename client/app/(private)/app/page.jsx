import { privateMetadata } from '../../../lib/seo.js';
import { getDictionary } from '../../../i18n/dictionaries.js';

export const metadata = privateMetadata(getDictionary('en').appStub.title);

export default function AppStub() {
  const en = getDictionary('en').appStub;
  const bn = getDictionary('bn').appStub;
  return (
    <main className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-sapphire">{bn.h1}</h1>
      <p className="mt-2">{bn.body}</p>
      <h2 className="mt-6 text-xl font-semibold">{en.h1}</h2>
      <p className="mt-2">{en.body}</p>
    </main>
  );
}
