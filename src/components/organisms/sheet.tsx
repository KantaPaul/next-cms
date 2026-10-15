'use client';

import type { JSX } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils/cn';

type Side = 'left' | 'right' | 'top' | 'bottom';

interface SheetContentConfig {
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  title?: string;
  description?: string;
  side?: Side;
  className?: string;
  scrollAreaClassName?: string;
}

interface SheetState {
  isOpen: boolean;
  content: SheetContentConfig | null;
}

interface SheetActions {
  openSheet: (config: SheetContentConfig) => void;
  closeSheet: () => void;
}

type SheetStore = SheetState & SheetActions;

const SHEET_DEFAULTS = {
  side: 'right' as const,
  props: {},
} as const;

const useSheetStore = create<SheetStore>(set => ({
  isOpen: false,
  content: null,
  openSheet: config =>
    set({ isOpen: true, content: { ...SHEET_DEFAULTS, ...config } }),
  closeSheet: () => set({ isOpen: false }),
}));

const selectSheetOpen = (state: SheetStore) => state.isOpen;
const selectSheetContent = (state: SheetStore) => state.content;
const selectSheetActions = (state: SheetStore) => ({
  openSheet: state.openSheet,
  closeSheet: state.closeSheet,
  isOpen: state.isOpen,
});

export const useSheet = () => useSheetStore(useShallow(selectSheetActions));

export function SheetProvider(): JSX.Element {
  const isOpen = useSheetStore(selectSheetOpen);
  const content = useSheetStore(selectSheetContent);
  const { closeSheet } = useSheet();

  const Component = content?.component;

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && closeSheet()}>
      <SheetContent
        side={content?.side ?? SHEET_DEFAULTS.side}
        className={cn('flex w-full flex-col gap-0 p-0 sm:max-w-lg', content?.className)}
      >
        {(content?.title || content?.description) && (
          <SheetHeader className="border-b border-border px-6 py-5 pr-12">
            {content?.title && <SheetTitle>{content.title}</SheetTitle>}
            {content?.description && (
              <SheetDescription>{content.description}</SheetDescription>
            )}
          </SheetHeader>
        )}

        {Component && (
          <div className={cn('min-h-0 flex-1 overflow-y-auto p-6', content?.scrollAreaClassName)}>
            <Component {...content?.props} closeSheet={closeSheet} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export interface SheetComponentProps {
  closeSheet: () => void;
  [key: string]: any;
}
