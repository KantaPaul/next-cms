'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { BuilderPageProps } from './builder-editor';

const BuilderEditor = dynamic(() => import('./builder-editor').then(m => m.BuilderEditor), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Loading the visual builder…
    </div>
  ),
});

export function BuilderLoader(props: BuilderPageProps) {
  return <BuilderEditor {...props} />;
}
