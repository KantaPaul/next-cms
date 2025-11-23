'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useAtomValue } from 'jotai';
import { X } from 'lucide-react';
import type { JSX } from 'react';
import { create } from 'zustand';
// import { Button } from '@/components/atoms/button/but';
import { Grid } from '@/components/atoms/layout';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { FULLSCREEN_TARGET } from '@/config/constant';
// import { fullscreenStateAtom } from '@/lib/atoms/fullscreen';
import { cn } from '@/lib/utils/cn';
import {
  getSafeDocumentBody,
  getSafeElementById,
} from '@/lib/utils/browser-only';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Types
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

// Constants
const SHEET_DEFAULTS = {
  side: 'right' as const,
  props: {},
} as const;

// Store
const useSheetStore = create<SheetStore>(set => ({
  isOpen: false,
  content: null,
  openSheet: config =>
    set({ isOpen: true, content: { ...SHEET_DEFAULTS, ...config } }),
  closeSheet: () => set({ isOpen: false }),
}));

// Selectors
const selectSheetOpen = (state: SheetStore) => state.isOpen;
const selectSheetContent = (state: SheetStore) => state.content;
const selectSheetActions = (state: SheetStore) => ({
  openSheet: state.openSheet,
  closeSheet: state.closeSheet,
  isOpen: state.isOpen,
});

// Custom Hook
export const useSheet = () => useSheetStore(selectSheetActions);

// Component
export function SheetProvider(): JSX.Element {
  const isOpen = useSheetStore(selectSheetOpen);
  const content = useSheetStore(selectSheetContent);
  const { closeSheet } = useSheet();

  const Component = content?.component;
  const side = content?.side || SHEET_DEFAULTS.side;

  // Class maps
  const getPositionClasses = (side: Side) => ({
    'inset-x-0 top-0 h-[40vh] w-full': side === 'top',
    'inset-y-0 right-0 w-screen h-screen max-w-lg': side === 'right',
    'inset-x-0 bottom-0 h-[40vh] w-full': side === 'bottom',
    'inset-y-0 left-0 w-screen max-w-md': side === 'left',
  });

  const getTransformClasses = (side: Side) => ({
    'data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full':
      side === 'right',
    'data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full':
      side === 'left',
    'data-[starting-style]:-translate-y-full data-[ending-style]:-translate-y-full':
      side === 'top',
    'data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full':
      side === 'bottom',
  });

//   const isFullscreen = useAtomValue(fullscreenStateAtom);
//   const portalTarget = getSafeElementById(FULLSCREEN_TARGET);

  return (
    <Dialog open={isOpen} onOpenChange={closeSheet}>
      <DialogContent
        // container={getSafeDocumentBody()}
      >
        {/* <Dialog.Backdrop className="ease-custom-ease fixed inset-0 z-10002 bg-black opacity-20 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 dark:opacity-70" /> */}

        {/* <Dialog.Popup
          className={cn(
            'dark:bg-dark-100 pointer-events-auto fixed z-[10003] transform bg-white shadow-xl transition-all duration-500 ease-in-out',
            getPositionClasses(side),
            getTransformClasses(side),
            content?.className
          )}
        > */}
          {(content?.title || content?.description) && (
            <header
              className={cn(
                'border-b-steel-100 dark:border-b-dark-300 dark:bg-dark-100 sticky top-0 flex justify-between border-b bg-white px-6 py-6 xl:px-10',
                content?.description ? 'items-start' : 'items-center'
              )}
            >
              <Grid className="gap-1">
                {content?.title && (
                  <h3
                    title={content.title}
                    className="text-steel-700 dark:text-dark-800 text-base font-medium lg:text-lg"
                  >
                    {content.title}
                  </h3>
                )}
                {content?.description && (
                  <p className="text-sm text-gray-500">{content.description}</p>
                )}
              </Grid>
              <Button
                size="sm"
                // variant="text"
                onClick={closeSheet}
                className="relative p-0 hover:bg-transparent"
              >
                <span className="absolute -inset-0.5" />
                <span className="sr-only">Close</span>
                <X className="size-5" aria-hidden="true" />
              </Button>
            </header>
          )}

          {Component && (
            <ScrollArea
              orientation="vertical"
              className="h-[calc(100vh-101px)] p-6 has-[.drawer-footer]:h-[calc(100vh-190px)] xl:p-8"
              viewportClassName="[&>[data-radix-scroll-area-content]]:p-0.5 px-1"
            >
              <Component {...content?.props} closeSheet={closeSheet} />
            </ScrollArea>
          )}
        {/* </Dialog.Popup> */}
      </DialogContent>
    </Dialog>
  );
}

// Component prop type
export interface SheetComponentProps {
  closeSheet: () => void;
  [key: string]: any;
}
