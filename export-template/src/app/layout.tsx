import type { Metadata } from 'next';
import './globals.css';
import {
  siteSettings,
  menusById,
} from '@/lib/content';
import { fontStylesheetUrl, themeStyle } from '@/builder/theme';

export const metadata: Metadata = {
  title: siteSettings.siteName,
  description: siteSettings.siteDescription ?? undefined,
  icons: siteSettings.favicon
    ? { icon: siteSettings.favicon }
    : undefined,
};

function Nav({ items }: { items: { id: string; label: string; url: string; target?: string | null; badge?: string | null; children: any[] }[] }) {
  if (!items?.length) return null;
  return (
    <ul className="flex flex-wrap items-center gap-4 text-sm font-medium">
      {items.map(item => (
        <li key={item.id} className="relative group">
          <a
            href={item.url}
            target={item.target ?? undefined}
            rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
            className="inline-flex items-center gap-1.5 hover:opacity-80"
          >
            {item.label}
            {item.badge && (
              <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-white/10">
                {item.badge}
              </span>
            )}
          </a>
          {item.children?.length > 0 && (
            <ul className="invisible absolute left-0 top-full z-20 min-w-44 rounded-md border border-black/10 bg-[var(--site-bg,#fff)] p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 dark:border-white/10">
              {item.children.map(child => (
                <li key={child.id}>
                  <a href={child.url} target={child.target ?? undefined} className="block rounded px-2 py-1.5 text-sm hover:opacity-80">
                    {child.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const header = siteSettings.headerMenuId
    ? menusById[siteSettings.headerMenuId]
    : undefined;
  const footer = siteSettings.footerMenuId
    ? menusById[siteSettings.footerMenuId]
    : undefined;
  const fontUrl = fontStylesheetUrl(siteSettings.themeTokens);
  const mode = siteSettings.themeTokens.colorMode === 'dark' ? 'dark' : 'light';

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {fontUrl && <link rel="stylesheet" href={fontUrl} />}
        <div
          className="site-root flex min-h-screen flex-col"
          data-site-theme={mode}
          style={themeStyle(siteSettings.themeTokens)}
        >
          <header className="s-border border-b px-5 py-4 md:px-8">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
              <a href="/" className="text-lg font-bold tracking-tight">
                {siteSettings.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={siteSettings.logo} alt={siteSettings.siteName} className="h-8 w-auto" />
                ) : (
                  siteSettings.siteName
                )}
              </a>
              {header && <Nav items={header.items} />}
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="s-border s-muted border-t px-5 py-10 text-sm md:px-8">
            <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-semibold text-[var(--site-fg)]">{siteSettings.siteName}</p>
                {siteSettings.siteDescription && (
                  <p className="mt-1 max-w-sm opacity-80">{siteSettings.siteDescription}</p>
                )}
              </div>
              {footer && <Nav items={footer.items} />}
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
