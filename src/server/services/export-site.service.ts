import fs from 'node:fs';
import path from 'node:path';
import * as archiverModule from 'archiver';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  menuItems,
  menus,
  pageContents,
  pages,
  posts,
  postContents,
  redirects,
  sites,
  siteSettings,
} from '@/db/schema';
import { ApplicationException } from '@/lib/utils/error';

export interface ExportReportData {
  siteId: string;
  siteName: string;
  generatedAt: string;
  pagesCount: number;
  postsCount: number;
  menusCount: number;
  redirectsCount: number;
  mediaAssetsCount: number;
  warnings: string[];
  externalUrlNotice: string;
}

/**
 * What the exported Next.js project is set up for:
 * - `standalone`: `output: 'standalone'` plus a Dockerfile, for any Node host.
 * - `vercel`: no standalone output or Dockerfile, a `vercel.json` with the
 *   site's redirects, and a README with Vercel deploy steps.
 */
export type ExportTarget = 'standalone' | 'vercel';

export const EXPORT_TARGETS: readonly ExportTarget[] = ['standalone', 'vercel'];

export function isExportTarget(value: unknown): value is ExportTarget {
  return typeof value === 'string' && (EXPORT_TARGETS as readonly string[]).includes(value);
}

export interface ExportSiteOptions {
  siteId?: string;
  outDir?: string;
  zipPath?: string;
  /** Defaults to `standalone`. */
  target?: ExportTarget;
}

/**
 * Versions for the exported project. Caret ranges so a fresh install picks up
 * patched releases: Vercel refuses to deploy Next.js/React versions with known
 * critical vulnerabilities (e.g. the December 2025 React Server Components fix).
 */
const EXPORT_DEPENDENCIES = {
  next: '^16.0.10',
  react: '^19.2.3',
  'react-dom': '^19.2.3',
};
const EXPORT_DEV_DEPENDENCIES = {
  typescript: '^5.9.3',
  '@types/node': '^20',
  '@types/react': '^19',
  '@types/react-dom': '^19',
};

const STANDALONE_DEPLOY_STEPS = `## Deploy (self-hosted)
Build and run with Node.js 20.9+:
\`\`\`bash
pnpm install
pnpm build
pnpm start
\`\`\`
Or run with Docker:
\`\`\`bash
docker build -t baked-site .
docker run -p 3000:3000 baked-site
\`\`\`
`;

const VERCEL_DEPLOY_STEPS = `## Deploy to Vercel
This folder is a ready-to-deploy Next.js project. Vercel detects Next.js and
builds it with \`next build\`; no environment variables or database are needed.
Redirects from the CMS are in \`vercel.json\`.

**Option A: Vercel CLI**
\`\`\`bash
npm i -g vercel
vercel          # first run links or creates the project and makes a preview deployment
vercel --prod   # production deployment
\`\`\`

**Option B: Git**
1. Push this folder to a new GitHub, GitLab or Bitbucket repository.
2. In Vercel, choose **Add New → Project**, import the repository and click **Deploy**.
   Keep the detected framework preset (Next.js) and the default build settings.

To try it locally first: \`pnpm install && pnpm build && pnpm start\`.
`;

/**
 * vercel.json for the export: the site's CMS redirects. `statusCode` 301 is a
 * permanent redirect; anything else (302) is temporary.
 */
function vercelConfig(redirectsData: Array<Record<string, unknown>>) {
  const redirectRules = redirectsData
    .map(row => ({
      source: String(row.fromPath ?? ''),
      destination: String(row.toPath ?? ''),
      permanent: row.statusCode === 301,
    }))
    .filter(rule => rule.source.startsWith('/') && rule.destination.length > 0);
  return {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    framework: 'nextjs',
    ...(redirectRules.length ? { redirects: redirectRules } : {}),
  };
}

const EXTERNAL_URL_NOTICE =
  'Forms and checkout keep working only through external URLs. ' +
  'Because this baked static export runs without a backend database or CMS form/checkout inbox, ' +
  'contact forms must be configured with an external actionUrl (e.g. Formspree or custom API), ' +
  'and product/checkout actions must direct to external Stripe Checkout URLs or payment providers.';

export class ExportSiteService {
  async exportSite(options: ExportSiteOptions = {}) {
    const siteId = options.siteId || 'default';
    const baseDir = process.cwd();
    const outDir = options.outDir || path.join(baseDir, 'export', 'site');
    const zipPath = options.zipPath || path.join(baseDir, 'export', 'site.zip');
    const target: ExportTarget = options.target ?? 'standalone';

    // Start clean so files from an export for another target (e.g. a
    // Dockerfile) never leak into this one.
    fs.rmSync(outDir, { recursive: true, force: true });

    // Ensure output directories exist
    fs.mkdirSync(outDir, { recursive: true });
    fs.mkdirSync(path.join(outDir, 'content'), { recursive: true });
    fs.mkdirSync(path.join(outDir, 'public', 'media'), { recursive: true });

    let siteInfo = { id: siteId, name: 'Baked Site', host: 'localhost', defaultLocale: 'en' };
    let settingsData: Record<string, unknown> = {};
    let pagesData: Array<Record<string, unknown>> = [];
    let postsData: Array<Record<string, unknown>> = [];
    let menusData: Array<Record<string, unknown>> = [];
    let redirectsData: Array<Record<string, unknown>> = [];

    try {
      // 1. Fetch site & settings
      const [dbSite] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
      if (dbSite) {
        siteInfo = {
          id: dbSite.id,
          name: dbSite.name,
          host: dbSite.primaryHost || 'localhost',
          defaultLocale: dbSite.defaultLocale,
        };
      }

      const [dbSettings] = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.siteId, siteId))
        .limit(1);
      if (dbSettings) {
        settingsData = { ...dbSettings };
      }

      // 2. Fetch published pages
      const dbPages = await db
        .select({
          id: pages.id,
          title: pages.title,
          slug: pages.slug,
          language: pages.language,
          isHome: pages.isHome,
          status: pages.status,
          visibility: pages.visibility,
          publishedAt: pages.publishedAt,
          updatedAt: pages.updatedAt,
        })
        .from(pages)
        .where(and(eq(pages.siteId, siteId), eq(pages.status, 'published')));

      for (const p of dbPages) {
        const [contentRow] = await db
          .select()
          .from(pageContents)
          .where(eq(pageContents.pageId, p.id))
          .limit(1);

        pagesData.push({
          ...p,
          content: (contentRow as any)?.canvas || (contentRow as any)?.content || null,
        });
      }

      // 3. Fetch published posts
      const dbPosts = await db
        .select({
          id: posts.id,
          title: posts.title,
          slug: posts.slug,
          excerpt: posts.excerpt,
          language: posts.language,
          status: posts.status,
          featuredImage: posts.featuredImage,
          publishedAt: posts.publishedAt,
          updatedAt: posts.updatedAt,
        })
        .from(posts)
        .where(and(eq(posts.siteId, siteId), eq(posts.status, 'published')));

      for (const po of dbPosts) {
        const [contentRow] = await db
          .select()
          .from(postContents)
          .where(eq(postContents.postId, po.id))
          .limit(1);

        postsData.push({
          ...po,
          content: contentRow?.canvas || contentRow?.body || null,
        });
      }

      // 4. Fetch menus
      const dbMenus = await db.select().from(menus).where(eq(menus.siteId, siteId));
      for (const m of dbMenus) {
        const items = await db
          .select()
          .from(menuItems)
          .where(eq(menuItems.menuId, m.id));
        menusData.push({
          ...m,
          items,
        });
      }

      // 5. Fetch redirects
      redirectsData = await db
        .select()
        .from(redirects)
        .where(eq(redirects.siteId, siteId));
    } catch {
      // Graceful offline fallback with sample baseline when database is not connected
      pagesData = [
        {
          id: 'home',
          title: 'Home',
          slug: '',
          language: 'en',
          isHome: true,
          status: 'published',
          content: {
            root: { props: { title: 'Welcome to Meridian' } },
            content: [],
          },
        },
      ];
      postsData = [
        {
          id: 'welcome-post',
          title: 'Welcome to your new site',
          slug: 'welcome',
          language: 'en',
          status: 'published',
          content: { root: { props: {} }, content: [] },
        },
      ];
      menusData = [{ id: 'main', name: 'Main Menu', items: [] }];
    }

    // Copy local media files if present
    let copiedMediaCount = 0;
    const mediaSources = [
      path.join(baseDir, 'public', 'uploads'),
      path.join(baseDir, 'public', 'media'),
      path.join(baseDir, 'uploads'),
    ];

    for (const src of mediaSources) {
      if (fs.existsSync(src)) {
        const files = fs.readdirSync(src);
        for (const file of files) {
          const srcFile = path.join(src, file);
          const stat = fs.statSync(srcFile);
          if (stat.isFile()) {
            fs.copyFileSync(srcFile, path.join(outDir, 'public', 'media', file));
            copiedMediaCount++;
          }
        }
      }
    }

    // Write content JSON files
    fs.writeFileSync(path.join(outDir, 'content', 'site.json'), JSON.stringify(siteInfo, null, 2));
    fs.writeFileSync(path.join(outDir, 'content', 'settings.json'), JSON.stringify(settingsData, null, 2));
    fs.writeFileSync(path.join(outDir, 'content', 'pages.json'), JSON.stringify(pagesData, null, 2));
    fs.writeFileSync(path.join(outDir, 'content', 'posts.json'), JSON.stringify(postsData, null, 2));
    fs.writeFileSync(path.join(outDir, 'content', 'menus.json'), JSON.stringify(menusData, null, 2));
    fs.writeFileSync(path.join(outDir, 'content', 'redirects.json'), JSON.stringify(redirectsData, null, 2));

    // Write export report
    const reportData: ExportReportData = {
      siteId: siteInfo.id,
      siteName: siteInfo.name,
      generatedAt: new Date().toISOString(),
      pagesCount: pagesData.length,
      postsCount: postsData.length,
      menusCount: menusData.length,
      redirectsCount: redirectsData.length,
      mediaAssetsCount: copiedMediaCount,
      warnings: [
        'Forms and checkout keep working only through external URLs.',
      ],
      externalUrlNotice: EXTERNAL_URL_NOTICE,
    };

    fs.writeFileSync(
      path.join(outDir, 'export-report.json'),
      JSON.stringify(reportData, null, 2)
    );

    const reportMarkdown = `# Export Report for ${siteInfo.name}

Generated at: ${reportData.generatedAt}
Site ID: ${siteInfo.id}

## Summary
- **Published Pages**: ${reportData.pagesCount}
- **Published Posts**: ${reportData.postsCount}
- **Menus**: ${reportData.menusCount}
- **Redirects**: ${reportData.redirectsCount}
- **Media Assets**: ${reportData.mediaAssetsCount}

## Important Notice on Forms & Checkout
> **Warning**: ${EXTERNAL_URL_NOTICE}

${target === 'vercel' ? VERCEL_DEPLOY_STEPS : STANDALONE_DEPLOY_STEPS}`;
    fs.writeFileSync(path.join(outDir, 'EXPORT_REPORT.md'), reportMarkdown);

    // Create standalone Next.js template files
    this.writeStandaloneAppTemplate(outDir, siteInfo.name, target, redirectsData);

    // Create zip archive
    await this.createZipArchive(outDir, zipPath);

    return {
      success: true,
      outDir,
      zipPath,
      target,
      report: reportData,
    };
  }

  private writeStandaloneAppTemplate(
    outDir: string,
    siteName: string,
    target: ExportTarget,
    redirectsData: Array<Record<string, unknown>>
  ) {
    const pkgJson = {
      name: 'baked-cms-site',
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'next dev -p 3000',
        build: 'next build',
        start: 'next start -p 3000',
      },
      engines: { node: '>=20.9.0' },
      dependencies: EXPORT_DEPENDENCIES,
      devDependencies: EXPORT_DEV_DEPENDENCIES,
    };
    fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify(pkgJson, null, 2));

    // Written up front so `next build` never has to generate it (and so JSON
    // imports type-check).
    const tsconfig = {
      compilerOptions: {
        target: 'ES2017',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: false,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'react-jsx',
        incremental: true,
        plugins: [{ name: 'next' }],
      },
      include: [
        'next-env.d.ts',
        '**/*.ts',
        '**/*.tsx',
        '.next/types/**/*.ts',
        '.next/dev/types/**/*.ts',
      ],
      exclude: ['node_modules'],
    };
    fs.writeFileSync(path.join(outDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
    fs.writeFileSync(
      path.join(outDir, 'next-env.d.ts'),
      '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n'
    );
    fs.writeFileSync(
      path.join(outDir, '.gitignore'),
      ['node_modules', '.next', 'out', '.vercel', '*.tsbuildinfo', ''].join('\n')
    );

    // Vercel builds Next.js natively; `output: 'standalone'` is only for
    // self-hosting (Docker / `node server.js`).
    const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
${target === 'standalone' ? "  output: 'standalone',\n" : ''}  images: {
    unoptimized: true,
  },
};
export default nextConfig;
`;
    fs.writeFileSync(path.join(outDir, 'next.config.mjs'), nextConfig);

    if (target === 'vercel') {
      fs.writeFileSync(
        path.join(outDir, 'vercel.json'),
        JSON.stringify(vercelConfig(redirectsData), null, 2) + '\n'
      );
    }

    const dockerfile = `FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
`;
    if (target === 'standalone') {
      fs.writeFileSync(path.join(outDir, 'Dockerfile'), dockerfile);
    }

    const appDir = path.join(outDir, 'app');
    fs.mkdirSync(appDir, { recursive: true });

    const layoutTsx = `import React from 'react';
import site from '../content/site.json';
import menusJson from '../content/menus.json';

const menus = menusJson as any[];

export const metadata = {
  title: site.name || 'Exported Website',
  description: 'Baked static export from Meridian',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const mainMenu = menus.find((m: any) => m.name === 'Main Menu' || m.id === 'main');
  const cmsBootstrap = \`window.__CMS__ = \${JSON.stringify({
    api: site.exportApiBase || ${JSON.stringify(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001')},
    site: site.id,
    locale: site.defaultLocale || 'en',
  })};\`;
  return (
    <html lang={site.defaultLocale || 'en'}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: cmsBootstrap }} />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <header style={{ padding: '1rem 2rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
          <strong>{site.name}</strong>
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <a href="/">Home</a>
            <a href="/blog">Blog</a>
          </nav>
        </header>
        <main>{children}</main>
        <footer style={{ padding: '2rem', borderTop: '1px solid #eee', textAlign: 'center', marginTop: '3rem' }}>
          <p>© {new Date().getFullYear()} {site.name}. Baked with Meridian.</p>
        </footer>
      </body>
    </html>
  );
}
`;
    fs.writeFileSync(path.join(appDir, 'layout.tsx'), layoutTsx);

    const catchAllTsx = `import React from 'react';
import pagesJson from '../../content/pages.json';

const pages = pagesJson as any[];

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const resolved = await params;
  const segments = resolved.slug || [];
  const slugPath = segments.join('/');

  const matched = pages.find((p: any) => {
    if (segments.length === 0) return p.isHome;
    return p.slug === slugPath || p.slug === segments[segments.length - 1];
  }) || pages[0];

  if (!matched) {
    return <div style={{ padding: '3rem' }}><h1>Page not found</h1></div>;
  }

  return (
    <div style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>{matched.title}</h1>
      <div>{typeof matched.content === 'string' ? matched.content : JSON.stringify(matched.content)}</div>
    </div>
  );
}
`;
    const slugDir = path.join(appDir, '[[...slug]]');
    fs.mkdirSync(slugDir, { recursive: true });
    fs.writeFileSync(path.join(slugDir, 'page.tsx'), catchAllTsx);

    const blogDir = path.join(appDir, 'blog');
    fs.mkdirSync(blogDir, { recursive: true });

    const blogListTsx = `import React from 'react';
import postsJson from '../../content/posts.json';

const posts = postsJson as any[];

export default function BlogList() {
  return (
    <div style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Blog Posts</h1>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {posts.map((post: any) => (
          <li key={post.id} style={{ marginBottom: '1.5rem' }}>
            <a href={'/blog/' + post.slug} style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
              {post.title}
            </a>
            {post.excerpt && <p>{post.excerpt}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
`;
    fs.writeFileSync(path.join(blogDir, 'page.tsx'), blogListTsx);

    const blogSlugDir = path.join(blogDir, '[slug]');
    fs.mkdirSync(blogSlugDir, { recursive: true });

    const blogPostTsx = `import React from 'react';
import postsJson from '../../../content/posts.json';

const posts = postsJson as any[];

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const resolved = await params;
  const post = posts.find((p: any) => p.slug === resolved.slug);

  if (!post) {
    return <div style={{ padding: '3rem' }}><h1>Post not found</h1></div>;
  }

  return (
    <article style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>{post.title}</h1>
      <div>{typeof post.content === 'string' ? post.content : JSON.stringify(post.content)}</div>
    </article>
  );
}
`;
    fs.writeFileSync(path.join(blogSlugDir, 'page.tsx'), blogPostTsx);

    const readmeMd = `# ${siteName} — Baked Website

This is a standalone, database-free Next.js export generated by Meridian.

## Notice on Forms & Checkout
${EXTERNAL_URL_NOTICE}

## Getting Started
\`\`\`bash
pnpm install
pnpm dev
\`\`\`

${target === 'vercel' ? VERCEL_DEPLOY_STEPS : STANDALONE_DEPLOY_STEPS}`;
    fs.writeFileSync(path.join(outDir, 'README.md'), readmeMd);
  }

  private createZipArchive(sourceDir: string, zipFilePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.mkdirSync(path.dirname(zipFilePath), { recursive: true });
      const output = fs.createWriteStream(zipFilePath);
      const archiveFn = typeof archiverModule === 'function'
        ? (archiverModule as any)
        : (archiverModule as Record<string, any>)['ZipArchive']
          ? (opts: any) => new (archiverModule as any)['ZipArchive'](opts)
          : (archiverModule as Record<string, any>)['default'];
      const archive = typeof (archiverModule as any)['ZipArchive'] === 'function'
        ? new (archiverModule as any)['ZipArchive']({ zlib: { level: 9 } })
        : archiveFn('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', (err: unknown) => reject(err));

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }
}

export const exportSiteService = new ExportSiteService();
