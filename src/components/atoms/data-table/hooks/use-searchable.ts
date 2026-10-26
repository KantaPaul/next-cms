import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export function useSearchable(searchKey = 'search') {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const value = searchParams.get(searchKey) ?? '';

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const { [searchKey]: _, ...includes } = Object.fromEntries(
      searchParams.entries()
    );
    const urlSearchParams = new URLSearchParams({
      ...includes,
      ...(value && { [searchKey]: value, page: '0' }),
    });
    startTransition(() => {
      router.replace(`${pathname}?${urlSearchParams.toString()}`);
    });
  };

  function action(formData: FormData) {
    const value = formData.get(searchKey) as string;
    const { [searchKey]: _, ...includes } = Object.fromEntries(
      searchParams.entries()
    );
    const urlSearchParams = new URLSearchParams({
      ...includes,
      ...(value && { [searchKey]: value, page: '0' }),
    });
    startTransition(() => {
      router.replace(`${pathname}?${urlSearchParams.toString()}`);
    });
  }

  return {
    isPending,
    action,
    onChange,
    value,
  };
}
