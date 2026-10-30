import * as React from 'react';
import { cn } from '../lib/cn';

export interface LiveAnnouncerProps {
  message?: string;
  assertive?: boolean;
  className?: string;
}

export function LiveAnnouncer({ message, assertive = false, className }: LiveAnnouncerProps) {
  const [announcement, setAnnouncement] = React.useState(message ?? '');

  React.useEffect(() => {
    if (message !== undefined) setAnnouncement(message);
  }, [message]);

  return (
    <div
      role="status"
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={cn('sr-only', className)}
    >
      {announcement}
    </div>
  );
}