'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Can } from '@/providers/access.provider';
import { PERMISSIONS } from '@/config/permissions';
import { cn } from '@/lib/utils/cn';

export function ExportWebsiteButton({
  className,
  variant = 'outline',
  showTextOnMobile = false,
}: {
  className?: string;
  variant?: 'outline' | 'default' | 'secondary' | 'ghost';
  showTextOnMobile?: boolean;
}) {
  return (
    <Can permission={PERMISSIONS.SETTINGS_MANAGE}>
      <Button
        asChild
        size="sm"
        variant={variant}
        className={cn('inline-flex items-center gap-1.5 shrink-0', className)}
      >
        <a href="/api/v1/export/site" download title="Export website (.zip)">
          <Download className="h-4 w-4 shrink-0" />
          <span className={showTextOnMobile ? 'inline' : 'hidden md:inline'}>
            Export website
          </span>
        </a>
      </Button>
    </Can>
  );
}
