'use client';

import isEmpty from 'lodash/isEmpty';
import { SearchIcon, X } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader } from 'rizzui';
import { Input, type RizzUIInputProps } from '@/components/atoms/forms';
import { focusRing } from '@/components/atoms/utils';
import { Button } from '@/components/ui/button';
import useQueryParams from '@/hooks/useQueryParam';
import { cn } from '@/lib/utils';
import { useBackpressure } from './hooks/use-backpressure';

interface SearchBaseProps extends RizzUIInputProps {
  initialQuery: string;
  formClassName?: string;
  page?: string;
}

function SearchBase({
  placeholder,
  initialQuery,
  inputClassName,
  formClassName,
  page: pageDefault = '0',
  ...rest
}: SearchBaseProps) {
  const [value, setValue] = useState(initialQuery);
  const pathname = usePathname();
  const { pending } = useFormStatus();
  const searchParams = useSearchParams();
  const syncRequired = isEmpty(searchParams.get('search'));
  const { triggerUpdate, formRef } = useBackpressure();

  async function onSubmit(formData: FormData) {
    const query = formData.get('search') as string;

    const { search, page, ...includes } = Object.fromEntries(searchParams.entries());

    const urlSearchParams = new URLSearchParams({
      ...includes,
      ...(query && { page: '1', search: query }),
    });

    await triggerUpdate(`${pathname}?${urlSearchParams.toString()}`);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
    formRef.current?.requestSubmit();
  }

  useEffect(() => {
    if (syncRequired) setValue('');
  }, [syncRequired]);

  // console.log('pending', pending);

  return (
    <form
      ref={formRef}
      action={onSubmit}
      className={cn('PROA--Table-Search relative', formClassName)}
    >
      <Input
        id="search"
        type="search"
        name="search"
        label="Search"
        prefix={<SearchIcon size={15} className="text-steel-400" />}
        labelClassName="sr-only"
        inputClassName={cn(inputClassName)}
        placeholder={placeholder ?? 'Search...'}
        value={value}
        onChange={onChange}
        suffixClassName="inline-flex justify-center"
        suffix={<LoadingSpinner initialQuery={initialQuery} />}
        {...rest}
      />
    </form>
  );
}

function LoadingSpinner({ initialQuery }: { initialQuery: string }) {
  const { pending } = useFormStatus();
  // const pending = true;
  const { removeParams } = useQueryParams();

  return pending ? (
    <Loader variant="spinner" size="sm" />
  ) : (
    initialQuery.length > 0 && (
      <Button
        size="sm"
        variant="ghost"
        className={cn('size-8 p-0', focusRing)}
        onClick={() => removeParams(['search'])}
      >
        <X size={18} />
      </Button>
    )
  );
}

export function SearchFallback() {
  return <SearchBase initialQuery="" />;
}

export function TableSearch({
  formClassName,
  page,
  ...rest
}: Omit<SearchBaseProps, 'initialQuery'>) {
  const query = useSearchParams().get('search') ?? '';
  return <SearchBase initialQuery={query} formClassName={formClassName} page={page} {...rest} />;
}
