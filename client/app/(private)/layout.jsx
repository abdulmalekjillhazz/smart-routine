import '@fontsource/noto-sans-bengali/400.css';
import '@fontsource/noto-sans-bengali/600.css';
import '@fontsource/noto-sans-bengali/700.css';
import '../globals.css';

// Private screens use their own root layout. Their pages are never indexed.
export default function PrivateLayout({ children }) {
  return (
    <html lang="bn">
      <body className="p-4">{children}</body>
    </html>
  );
}
