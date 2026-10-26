import { BanIcon } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { Flex } from '@/components/atoms/layout';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Toggle } from '@/components/ui/toggle';

const BACKGROUND_COLORS = [
  {
    name: 'Default',
    color: '',
  },
  {
    name: 'Gray',
    color: '#b1b9c9',
  },
  {
    name: 'Red',
    color: '#FF6969',
  },
  {
    name: 'Green',
    color: '#96C291',
  },
  {
    name: 'Blue',
    color: '#78C1F3',
  },
  {
    name: 'Yellow',
    color: '#ECEE81',
  },
  {
    name: 'Orange',
    color: '#F1C27B',
  },
  {
    name: 'Pink',
    color: '#FFA1F5',
  },
  {
    name: 'Purple',
    color: '#BC7AF9',
  },
  {
    name: 'Teal',
    color: '#87CBB9',
  },
  {
    name: 'Maroon',
    color: '#BE5A83',
  },
];

interface ColorSelectorProps {
  editor: any;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

export function AddColor({ editor, setIsOpen, isOpen }: ColorSelectorProps) {
  const activeBackgroundItem = BACKGROUND_COLORS.find(({ color }) =>
    editor.isActive('highlight', { color })
  );

  return (
    <Popover open={isOpen}>
      <PopoverTrigger asChild>
        <Toggle
          pressed={editor.isActive('textStyle', {
            color: activeBackgroundItem?.color,
          })}
          onClick={() => {
            setIsOpen(!isOpen);
          }}
          className="relative flex h-9 cursor-pointer items-center justify-center rounded-lg p-2 transition-colors hover:bg-steel-50/80 hover:dark:bg-steel-700"
        >
          <div
            className="h-5 w-5 rounded-full border border-steel-200 transition-colors dark:border-steel-600"
            style={{
              borderColor: activeBackgroundItem?.color,
              backgroundColor: activeBackgroundItem?.color,
            }}
          />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent
        className="w-[335px] overflow-hidden overflow-y-auto rounded-md border border-steel-100 p-1 shadow-lg dark:border-steel-600"
        align="center"
        sideOffset={15}
      >
        <Flex className="flex-wrap items-center justify-start gap-0">
          {BACKGROUND_COLORS.map((item, index) => (
            <button
              type="button"
              key={index}
              onClick={() => {
                editor.commands.unsetHighlight();
                item.name !== 'Default' &&
                  editor.commands.setHighlight({ color: item.color });
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
