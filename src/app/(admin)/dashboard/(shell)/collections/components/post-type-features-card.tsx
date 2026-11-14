'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  POST_TYPE_SUPPORT_FEATURES,
  type PostTypeSupports,
  normalizePostTypeSupports,
} from '@/config/post-types';
import { updateSupportsAction } from '../_modules/collection-taxonomies.actions';
import { handleActionResponse } from '@/lib/utils/handle-action-response';

export function PostTypeFeaturesCard({
  collectionId,
  collectionSlug,
  initialSupports,
}: {
  collectionId: string;
  collectionSlug: string;
  initialSupports?: PostTypeSupports;
}) {
  const t = useTranslations('collections.features');
  const router = useRouter();
  const [supports, setSupports] = useState<PostTypeSupports>(() =>
    normalizePostTypeSupports(initialSupports)
  );
  const [isPending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);

  const toggle = (key: keyof PostTypeSupports, value: boolean) => {
    setSupports(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const save = () => {
    startTransition(async () => {
      await handleActionResponse(
        updateSupportsAction({
          id: collectionId,
          collectionSlug,
          supports,
        }),
        () => {
          toast.success(t('updated'));
          setDirty(false);
          router.refresh();
        }
      );
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>
              {t('intro')}
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={!dirty || isPending}
          >
            {isPending && <Loader2 className="animate-spin" />} {t('save')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-steel-100 rounded-md border border-steel-200 dark:divide-dark-300 dark:border-dark-300">
          {POST_TYPE_SUPPORT_FEATURES.map(feature => {
            const isSupported = supports[feature.key] ?? true;
            const inputId = `support-${feature.key}`;
            return (
              <li
                key={feature.key}
                className="flex items-center justify-between gap-4 p-3.5"
              >
                <div className="flex flex-col gap-0.5">
                  <label
                    htmlFor={inputId}
                    className="cursor-pointer text-sm font-medium"
                  >
                    {t(`items.${feature.key}.label`)}
                  </label>
                  <p className="text-xs text-steel-500">
                    {t(`items.${feature.key}.description`)}
                  </p>
                </div>
                <Switch
                  id={inputId}
                  checked={isSupported}
                  onChange={checked => toggle(feature.key, checked)}
                  aria-label={t('toggle', { name: t(`items.${feature.key}.label`) })}
                />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
