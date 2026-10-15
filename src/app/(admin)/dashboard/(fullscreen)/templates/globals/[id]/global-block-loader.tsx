'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { GlobalBlockEditorProps } from './global-block-editor';

const GlobalBlockEditor = dynamic(() => import('./global-block-editor').then(m => m.GlobalBlockEditor), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Loading the editor…
    </div>
  ),
});

export function GlobalBlockLoader(props: GlobalBlockEditorProps) {
  return <GlobalBlockEditor {...props} />;
}
