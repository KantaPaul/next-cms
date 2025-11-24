'use client';

import { Input } from '@/components/atoms/forms';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Toggle } from '@/components/ui/toggle';
import { isValidUrl } from '@/lib/utils';
import { cn } from '@/lib/utils/cn';
import { CheckIcon, LinkIcon } from 'lucide-react';
import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface LinkSelectorProps {
  editor: any;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

export function AddLink({ editor, setIsOpen, isOpen }: LinkSelectorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string>('');

  const setLink = () => {
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    if (!isValidUrl(url)) {
      toast.error('Enter a valid URL in the correct format (e.g., https://www.example.com).');
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  // Input Autofocus
  useEffect(() => {
    inputRef.current && inputRef.current?.focus();
  });

  return (
    <Popover open={isOpen}>
      <PopoverTrigger asChild>
        <Toggle
          pressed={editor.isActive('link')}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
            editor?.isActive('link')
              ? 'bg-steel-100/50 dark:bg-steel-600/50'
              : 'text-steel-700 hover:bg-steel-50/80 dark:text-steel-100 hover:dark:bg-steel-700'
          )}
          onClick={() => {
            setIsOpen(!isOpen);
          }}
        >
          <LinkIcon className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent
        className="z-99999 flex w-72 items-center gap-2 rounded-md border border-steel-100 bg-white p-1 shadow-lg dark:border-steel-500 dark:bg-steel-800"
        align="center"
        sideOffset={15}
      >
        <div className="flex w-full items-center gap-2 overflow-hidden rounded border border-steel-200 bg-white pr-2 dark:border-steel-600 dark:bg-steel-800">
          <Input
            ref={inputRef}
            // size="sm"
            // variant="text"
            placeholder="Paste link"
            className="w-full rounded-none"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button
            variant="ghost"
            className="flex h-7 w-7 items-center justify-center rounded bg-steel-100 p-0 text-steel-500/80 transition-all hover:bg-steel-100/50 dark:bg-steel-600 dark:text-steel-200 dark:hover:bg-steel-600/50"
            onClick={setLink}
          >
            <CheckIcon size={16} strokeWidth={2} />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
