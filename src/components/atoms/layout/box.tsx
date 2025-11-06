import { forwardRef } from 'react';

export interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Box = forwardRef<HTMLDivElement, BoxProps>(({ ...rest }, ref) => {
  return <div ref={ref} {...rest} />;
});

Box.displayName = 'Box';
