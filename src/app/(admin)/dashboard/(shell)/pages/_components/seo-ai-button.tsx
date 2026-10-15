'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useAiEnabled } from '@/components/ai/use-ai-status';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { generateSeo } from '@/app/(admin)/dashboard/(shell)/pages/_modules/ai.actions';

type SeoSuggestion = { title: string; description: string; keywords: string };

export function SeoAiButton({ pageId, onApply }: { pageId: string; onApply: (result: SeoSuggestion) => void }) {
  const enabled = useAiEnabled();
  const [isPending, startTransition] = useTransition();
  const [suggestion, setSuggestion] = useState<SeoSuggestion | null>(null);

  if (!enabled) return null;

  const run = () =>
    startTransition(async () => {
      await handleActionResponse(await generateSeo({ pageId }), result => setSuggestion(result as SeoSuggestion));
    });

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-900 dark:bg-violet-950/30">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-violet-800 dark:text-violet-200">Generate metadata from the saved draft.</p>
        <Button type="button" size="sm" variant="outline" onClick={run} disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} Suggest
        </Button>
      </div>
      {suggestion && (
        <div className="mt-3 space-y-2 text-xs">
          <p>
            <span className="font-semibold">Title:</span> {suggestion.title}
          </p>
          <p>
            <span className="font-semibold">Description:</span> {suggestion.description}
          </p>
          <p>
            <span className="font-semibold">Keywords:</span> {suggestion.keywords}
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onApply(suggestion);
                setSuggestion(null);
              }}
            >
              Apply
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSuggestion(null)}>
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
