import type { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading as HeadingIcon,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Type,
  UnderlineIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { borderColor } from '@/components/atoms/table-grid';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils/cn';
import { Input } from '../forms';

interface ToolbarProps {
  className?: string;
  editor: Editor;
}

export function Toolbar({ className, editor }: ToolbarProps) {
  const [url, setUrl] = useState<string>('');

  const isValidUrl = (string: string): boolean => {
    try {
      const url = new URL(string);
      return ['http:', 'https:'].includes(url.protocol);
    } catch (_) {
      return false;
    }
  };

  const setLink = () => {
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    if (!isValidUrl(url)) {
      toast.error('Please enter a valid URL');
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const getCurrentTextStyle = () => {
    if (editor.isActive('heading', { level: 1 })) return 'Heading 1';
    if (editor.isActive('heading', { level: 2 })) return 'Heading 2';
    if (editor.isActive('heading', { level: 3 })) return 'Heading 3';
    if (editor.isActive('heading', { level: 4 })) return 'Heading 4';
    if (editor.isActive('heading', { level: 5 })) return 'Heading 5';
    if (editor.isActive('heading', { level: 6 })) return 'Heading 6';
    return 'Paragraph';
  };

  return (
    <div
      className={cn(
        'scrollbar-hide editor-toolbar sticky top-0 left-0 z-20 flex w-full select-none items-center overflow-x-auto rounded-t-lg border-x border-t bg-background/95 p-1 backdrop-blur-sm supports-backdrop-blur:bg-background/60',
        borderColor,
        className
      )}
    >
      {/* Typography Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 pr-1 pl-2 hover:bg-steel-50 dark:hover:bg-dark-300"
          >
            <Type className="size-4" />
            <span className="max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap">
              {getCurrentTextStyle()}
            </span>
            <ChevronDown className="ms-2 size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel className="mx-1 select-none px-2 pt-1.5 pb-2 font-semibold text-muted-foreground text-xs">
            Typography
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="flex items-center justify-between"
              onClick={() => editor.chain().focus().setParagraph().run()}
            >
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                <span>Paragraph</span>
              </div>
              {editor.isActive('paragraph') && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center justify-between"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              <div className="flex items-center gap-2">
                <Heading1 className="h-4 w-4" />
                <span>Heading 1</span>
              </div>
              {editor.isActive('heading', { level: 1 }) && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center justify-between"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <div className="flex items-center gap-2">
                <Heading2 className="h-4 w-4" />
                <span>Heading 2</span>
              </div>
              {editor.isActive('heading', { level: 2 }) && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center justify-between"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <div className="flex items-center gap-2">
                <Heading3 className="h-4 w-4" />
                <span>Heading 3</span>
              </div>
              {editor.isActive('heading', { level: 3 }) && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center justify-between"
              onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            >
              <div className="flex items-center gap-2">
                <HeadingIcon className="h-4 w-4" />
                <span>Heading 4</span>
              </div>
              {editor.isActive('heading', { level: 4 }) && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center justify-between"
              onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
            >
              <div className="flex items-center gap-2">
                <HeadingIcon className="h-4 w-4" />
                <span>Heading 5</span>
              </div>
              {editor.isActive('heading', { level: 5 }) && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center justify-between"
              onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
            >
              <div className="flex items-center gap-2">
                <HeadingIcon className="h-4 w-4" />
                <span>Heading 6</span>
              </div>
              {editor.isActive('heading', { level: 6 }) && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="mx-2 h-4 w-px bg-steel-100 dark:bg-dark-300" />

      {/* Text Formatting */}
      <Toggle
        size="sm"
        pressed={editor.isActive('bold')}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('italic')}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('underline')}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('code')}
        onPressedChange={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="h-4 w-4" />
      </Toggle>

      <div className="mx-2 h-4 w-px bg-steel-100 dark:bg-dark-300" />

      {/* Lists */}
      <Toggle
        size="sm"
        pressed={editor.isActive('bulletList')}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('orderedList')}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>

      <div className="mx-2 h-4 w-px bg-steel-100 dark:bg-dark-300" />

      {/* Alignment */}
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'left' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <AlignLeft className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'center' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <AlignCenter className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'right' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <AlignRight className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'justify' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('justify').run()}
      >
        <AlignJustify className="h-4 w-4" />
      </Toggle>

      <div className="mx-2 h-4 w-px bg-steel-100 dark:bg-dark-300" />

      {/* Link */}
      <Popover>
        <PopoverTrigger asChild>
          <Toggle size="sm" pressed={editor.isActive('link')}>
            <LinkIcon className="h-4 w-4" />
          </Toggle>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="flex space-x-2">
            <Input placeholder="Paste link" value={url} onChange={(e) => setUrl(e.target.value)} />
            <Button onClick={setLink}>Add</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
