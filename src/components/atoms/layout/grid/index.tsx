import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

import { columnClassNames, type NumberOfGrids } from './styles';

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: NumberOfGrids;
}

export const Grid = forwardRef<HTMLDivElement, GridProps>((props, ref) => {
  const { columns = '1', className, ...rest } = props;

  return (
    <div ref={ref} className={cn('grid gap-7', columnClassNames[columns], className)} {...rest} />
  );
});

Grid.displayName = 'Grid';
