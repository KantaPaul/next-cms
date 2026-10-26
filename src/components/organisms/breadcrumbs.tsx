import isEmpty from 'lodash/isEmpty';
import { Fragment } from 'react';

import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbSeparator,
} from '@/components/atoms/breadcrumb';
import Link from '@/components/atoms/next/link';
import { focusOutline, focusRing } from '@/components/atoms/utils';
import { cn } from '@/lib/utils/cn';

export type Breadcrumb = {
  href?: string;
  title: string;
};

interface BreadcrumbProps {
  className?: string;
  breadcrumbs?: Breadcrumb[];
}

export function Breadcrumbs({ className, breadcrumbs }: BreadcrumbProps) {
  if (isEmpty(breadcrumbs)) return null;

  return (
    <BreadcrumbRoot className={cn('flex', className)}>
      <BreadcrumbList>
        {breadcrumbs?.map((option, index, array) => {
          return (
            <Fragment key={index}>
              <BreadcrumbItem>
                {option.href ? (
                  <BreadcrumbLink asChild>
                    <Link
                      href={option.href}
                      className={cn(
                        'rounded-sm px-1.5 py-0.5 hover:underline',
                        focusRing,
                        // focusOutline,
                        'focus-visible:ring-offset-0'
                      )}
                    >
                      {option.title}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="px-1.5 py-0.5">
                    {option.title}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index !== array.length - 1 && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </BreadcrumbRoot>
  );
}
