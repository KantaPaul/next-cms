import { Title } from '@/components/atoms/content';
import { Flex } from '@/components/atoms/layout';
import {
  type Breadcrumb,
  Breadcrumbs,
} from '@/components/organisms/breadcrumbs';
import { isArraySafe } from '@/lib/utils/bool-check';
import { cn } from '@/lib/utils/cn';

interface PageHeaderProps {
  title?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  children?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  breadcrumbsClassName?: string;
}

export function PageHeader({
  title,
  children,
  className,
  breadcrumbs,
  titleClassName,
  breadcrumbsClassName,
}: PageHeaderProps) {
  return (
    <>
      {isArraySafe(breadcrumbs) && (
        <Breadcrumbs
          breadcrumbs={breadcrumbs}
          className={cn('mb-5', breadcrumbsClassName)}
        />
      )}
      <Flex
        align="center"
        justify="between"
        className={cn(
          'mb-6 flex-wrap justify-start gap-2.5 sm:flex-nowrap md:gap-4 lg:mb-8 xl:flex-nowrap xl:justify-between',
          className
        )}
      >
        <Title
          className={cn(
            'w-full text-lg md:text-xl lg:text-2xl',
            titleClassName
          )}
        >
          {title}
        </Title>

        {children}
      </Flex>
    </>
  );
}
