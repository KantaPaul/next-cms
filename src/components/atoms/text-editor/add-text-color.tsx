import { BanIcon } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils/cn';
import { Flex } from '../layout';

const TEXT_COLORS = [
  {
    name: 'Default',
    color: '',
  },
  {
    name: 'White',
    color: '#FFFFFF',
  },
  {
    name: 'Black',
    color: '#000000',
  },
  {
    name: 'Red',
    color: '#ED2B2A',
  },
  {
    name: 'Green',
    color: '#539165',
  },
  {
    name: 'Blue',
    color: '#337CCF',
  },
  {
    name: 'Yellow',
    color: '#edc541',
  },
  {
    name: 'Orange',
    color: '#FF9351',
  },
  {
    name: 'Pink',
    color: '#ff74bc',
  },
  {
    name: 'Purple',
    color: '#bf51e0',
  },
  {
    name: 'Teal',
    color: '#088395',
  },
  {
    name: 'Maroon',
    color: '#862B0D',
  },
];

interface ColorSelectorProps {
  editor: any;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

export function AddTextColor({
  editor,
  setIsOpen,
  isOpen,
}: ColorSelectorProps) {
  const activeColorItem = TEXT_COLORS.find(({ color }) =>
    editor.isActive('textStyle', { color })
  );

  return (
    <Popover open={isOpen}>
      <PopoverTrigger asChild>
        <Toggle
          pressed={editor.isActive('textStyle', {
            color: activeColorItem?.color,
          })}
          className={cn(
            'relative flex h-9 cursor-pointer items-center justify-center rounded-lg p-2 transition-colors hover:bg-steel-50/80 hover:dark:bg-steel-700',
            editor.isActive('textStyle', { color: '#FFFFFF' }) &&
              'hover:bg-transparent dark:hover:bg-transparent'
          )}
          onClick={() => {
            setIsOpen(!isOpen);
          }}
        >
          <span
            className={cn(
              'rounded px-1.5 font-bold text-lg',
              editor.isActive('textStyle', { color: '#FFFFFF' }) &&
                'bg-steel-700'
            )}
            style={{
              color: activeColorItem?.color,
            }}
          >
            T
          </span>
        </Toggle>
      </PopoverTrigger>
      <PopoverContent
        className="w-[335px] overflow-hidden overflow-y-auto rounded-md border border-steel-100 p-1 shadow-lg dark:border-steel-600"
        align="center"
        sideOffset={15}
      >
        <Flex className="flex-wrap items-center justify-start gap-0">
          {TEXT_COLORS.map((item, index) => (
            <button
              type="button"
              key={index}
              onClick={() => {
                editor.commands.unsetColor();
                item.name !== 'Default' &&
                  editor
                    .chain()
                    .focus()
                    .setColor(item.color || '')
                    .run();
                setIsOpen(false);
              }}
              className="flex items-center justify-between rounded p-2 hover:bg-steel-100/70 dark:hover:bg-steel-600"
            >
              {item.name === 'Default' ? (
                <BanIcon size={20} strokeWidth={2} className="text-steel-400" />
              ) : (
                <span
                  className="block h-5 w-5 items-center justify-center rounded-full border border-steel-200 p-1 font-medium text-steel-700 leading-none dark:border-steel-600 dark:text-steel-100"
                  style={{ backgroundColor: item.color }}
                />
              )}
            </button>
          ))}
        </Flex>
      </PopoverContent>
    </Popover>
  );
}
