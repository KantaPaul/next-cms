import React from 'react';
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb';
import { PanelHeader } from './PanelHeader';
import { cn } from '../lib/cn';

export interface PanelStackItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
  content: React.ReactNode;
}

export interface PanelStackProps {
  items: PanelStackItem[];
  onPop?: () => void;
  onSelectIndex?: (index: number) => void;
  showHeader?: boolean;
  className?: string;
}

export const PanelStack: React.FC<PanelStackProps> = ({
  items,
  onPop,
  onSelectIndex,
  showHeader = true,
  className,
}) => {
  if (items.length === 0) {
    return null;
  }

  const currentItem = items[items.length - 1];
  const canPop = items.length > 1;

  const breadcrumbItems: BreadcrumbItem[] = items.map((item, idx) => ({
    id: item.id,
    label: item.title,
    onSelect: () => {
      if (onSelectIndex) {
        onSelectIndex(idx);
      } else if (idx < items.length - 1 && onPop) {
        for (let i = 0; i < items.length - 1 - idx; i++) {
          onPop();
        }
      }
    },
  }));

  return (
    <div className={cn('flex flex-col flex-1 h-full min-h-0 min-w-0 bg-[var(--ne-surface)]', className)}>
      {showHeader && (
        <PanelHeader
          title={currentItem.title}
          subtitle={currentItem.subtitle}
          icon={currentItem.icon}
          onBack={canPop ? onPop : undefined}
          backLabel={`Back to ${items[items.length - 2]?.title || 'previous'}`}
          breadcrumbs={
            items.length > 1 ? (
              <Breadcrumb items={breadcrumbItems} ariaLabel="Panel hierarchy" />
            ) : undefined
          }
          actions={currentItem.headerAction}
        />
      )}

      <div className="flex-1 overflow-auto ne-scrollbar min-h-0">
        {currentItem.content}
      </div>
    </div>
  );
};
