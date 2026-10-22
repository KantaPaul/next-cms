'use client';

import '@measured/puck/puck.css';
import { Puck, type Config, type Data } from '@measured/puck';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { builderConfig, BUILDER_VIEWPORTS } from '@/builder/config';
import type { BuilderItem } from '@/builder/data';
import { PAGES } from '@/config/pages';
import type { ThemeTokens } from '@/db/schemas/pages.schema';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { saveGlobalBlock } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions';

export type GlobalBlockEditorProps = {
  block: { id: string; name: string; category: string; content: unknown };
  themeTokens: ThemeTokens;
};

const { GlobalRef: _globalRef, ...components } = builderConfig.components;
const { global: _global, ...categories } = builderConfig.categories ?? {};
const globalConfig = { ...builderConfig, components, categories } as Config;

const serializeState = (data: Data) =>
  JSON.stringify({ content: data.content ?? [], zones: data.zones ?? {} });

export function GlobalBlockEditor({ block, themeTokens }: GlobalBlockEditorProps) {
  const router = useRouter();

  const initialData = useMemo<Data>(() => {
    let content: Data['content'] = [];
    let zones: Data['zones'] = {};

    if (Array.isArray(block.content)) {
      content = block.content as Data['content'];
    } else if (block.content && typeof block.content === 'object') {
      const obj = block.content as { content?: Data['content']; zones?: Data['zones'] };
      content = Array.isArray(obj.content) ? obj.content : [];
      zones = obj.zones && typeof obj.zones === 'object' ? obj.zones : {};
    }

    return {
      root: { props: {} },
      content,
      zones,
    };
  }, [block.content]);

  const dataRef = useRef<Data>(initialData);
  const [saved, setSaved] = useState(() => serializeState(initialData));
  const [current, setCurrent] = useState(saved);
  const [isPending, startTransition] = useTransition();
  const dirty = current !== saved;

  const save = () =>
    startTransition(async () => {
      const content = (dataRef.current.content ?? []) as BuilderItem[];
      const zones = (dataRef.current.zones ?? {}) as Record<string, BuilderItem[]>;
      if (!content.length) {
        toast.error('A global block needs at least one section.');
        return;
      }
      await handleActionResponse(
        saveGlobalBlock({
          id: block.id,
          name: block.name,
          category: block.category,
          content: { content, zones },
        }),
        () => {
          setSaved(serializeState(dataRef.current));
          toast.success('Global block saved. Every page using it now shows this version.');
          router.refresh();
        }
      );
    });

  return (
    <div data-theme="light" className="h-screen bg-background text-foreground [&_[class*='Puck--']]:h-full">
      <Puck
        config={globalConfig}
        data={initialData}
        onChange={data => {
          dataRef.current = data;
          setCurrent(serializeState(data));
        }}
        headerTitle={`Global block · ${block.name}`}
        overrides={{
          headerActions: () => (
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Button type="button" variant="ghost" size="sm" asChild>
                <Link href={PAGES.DASHBOARD.TEMPLATES} aria-label="Back to templates and globals">
                  <ArrowLeft /> <span className="hidden xl:inline">Templates &amp; Globals</span>
                </Link>
              </Button>
              {dirty && <span className="hidden text-xs text-amber-600 lg:inline">Unsaved changes</span>}
              <Button type="button" size="sm" onClick={save} disabled={!dirty || isPending}>
                {isPending && <Loader2 className="animate-spin" />} Save global block
              </Button>
            </div>
          ),
        }}
        viewports={BUILDER_VIEWPORTS}
        metadata={{ themeTokens }}
        iframe={{ enabled: true }}
      />
    </div>
  );
}
