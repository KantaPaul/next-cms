'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useFormAction } from '@/hooks/use-form-action';
import {
  type CustomCodeInput,
  customCodeSchema,
} from '../../_modules/settings.schemas';
import { updateCustomCode } from '../../_modules/settings.actions';

export function CustomCodeForm({
  initialValues,
}: {
  initialValues?: CustomCodeInput;
}) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { isDirty, errors },
  } = useForm<CustomCodeInput>({
    resolver: zodResolver(customCodeSchema),
    defaultValues: {
      css: initialValues?.css ?? '',
      headHtml: initialValues?.headHtml ?? '',
      bodyStartHtml: initialValues?.bodyStartHtml ?? '',
      bodyEndHtml: initialValues?.bodyEndHtml ?? '',
    },
  });

  const { submit, isPending } = useFormAction(
    async (data: CustomCodeInput) => {
      const result = await updateCustomCode(data);
      return result as Record<string, unknown>;
    },
    {
      onSuccess: () => {
        toast.success('Custom code saved and applied to the site.');
        router.refresh();
      },
    }
  );

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-8 max-w-4xl">
      <div className="rounded-lg border border-steel-200 bg-white p-6 dark:border-dark-300 dark:bg-dark-100">
        <h3 className="text-base font-semibold text-foreground">
          Site-wide Custom CSS
        </h3>
        <p className="mt-1 text-sm text-steel-500 dark:text-steel-400">
          CSS added here will be applied across the entire public site in a
          global stylesheet.
        </p>
        <div className="mt-4">
          <textarea
            {...register('css')}
            rows={8}
            placeholder="/* Add global CSS rules here */&#10;body {&#10;  /* ... */&#10;}"
            className="w-full font-mono text-sm rounded-md border border-steel-200 bg-slate-50 p-3 text-foreground dark:border-dark-300 dark:bg-dark-200 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.css && (
            <p className="mt-1 text-xs text-rose-500">{errors.css.message}</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-steel-200 bg-white p-6 dark:border-dark-300 dark:bg-dark-100">
        <h3 className="text-base font-semibold text-foreground">
          Head Code Injection (&lt;head&gt;)
        </h3>
        <p className="mt-1 text-sm text-steel-500 dark:text-steel-400">
          Injected before closing the site shell header. Useful for meta tags,
          analytics scripts, or external resource links.
        </p>
        <div className="mt-4">
          <textarea
            {...register('headHtml')}
            rows={6}
            placeholder="<meta name=&quot;custom&quot; content=&quot;value&quot; />&#10;<script>/* analytics */</script>"
            className="w-full font-mono text-sm rounded-md border border-steel-200 bg-slate-50 p-3 text-foreground dark:border-dark-300 dark:bg-dark-200 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.headHtml && (
            <p className="mt-1 text-xs text-rose-500">{errors.headHtml.message}</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-steel-200 bg-white p-6 dark:border-dark-300 dark:bg-dark-100">
        <h3 className="text-base font-semibold text-foreground">
          Body Start Code (&lt;body&gt; opening)
        </h3>
        <p className="mt-1 text-sm text-steel-500 dark:text-steel-400">
          Injected immediately after the body opening tag. Ideal for Google Tag
          Manager noscript tags.
        </p>
        <div className="mt-4">
          <textarea
            {...register('bodyStartHtml')}
            rows={5}
            placeholder="<noscript>...</noscript>"
            className="w-full font-mono text-sm rounded-md border border-steel-200 bg-slate-50 p-3 text-foreground dark:border-dark-300 dark:bg-dark-200 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.bodyStartHtml && (
            <p className="mt-1 text-xs text-rose-500">
              {errors.bodyStartHtml.message}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-steel-200 bg-white p-6 dark:border-dark-300 dark:bg-dark-100">
        <h3 className="text-base font-semibold text-foreground">
          Body End Code (&lt;/body&gt; closing)
        </h3>
        <p className="mt-1 text-sm text-steel-500 dark:text-steel-400">
          Injected just before the closing body tag. Ideal for chat widgets,
          tracking pixels, or deferred scripts.
        </p>
        <div className="mt-4">
          <textarea
            {...register('bodyEndHtml')}
            rows={5}
            placeholder="<script>/* live chat widget */</script>"
            className="w-full font-mono text-sm rounded-md border border-steel-200 bg-slate-50 p-3 text-foreground dark:border-dark-300 dark:bg-dark-200 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.bodyEndHtml && (
            <p className="mt-1 text-xs text-rose-500">{errors.bodyEndHtml.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending || !isDirty}>
          {isPending ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="me-2 h-4 w-4" />
              Save custom code
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
