import { Plus_Jakarta_Sans } from 'next/font/google';

// The editor chrome's UI face. editor-ui's `--ne-font-ui` reads
// `--font-plus-jakarta`, which is set on <html> so `:root` and the
// dialogs that portal to <body> both resolve it.
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'] });

export default function FullscreenLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <style>{`html{--font-plus-jakarta:${plusJakarta.style.fontFamily}}`}</style>
      {children}
    </>
  );
}
