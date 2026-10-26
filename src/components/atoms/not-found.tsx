import { Title } from '@/components/atoms/content';
import { NotFoundIllustration } from '@/components/atoms/icons/not-found';
import { Flex } from '@/components/atoms/layout';
import { cn } from '@/lib/utils/cn';

interface NotFoundProps {
  message?: string;
  className?: string;
}

export function NotFound({
  className,
  message = 'No Records Found!',
}: NotFoundProps) {
  return (
    <Flex justify="center" className={cn('flex-col gap-12 p-10', className)}>
      <NotFoundIllustration className="flex h-[230px] w-[240px] items-center justify-center" />

      <Title className="font-medium text-base text-steel-400 md:text-lg lg:text-xl dark:text-steel-400">
        {message}
      </Title>
    </Flex>
  );
}
