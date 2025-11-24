'use client';

import { BubbleMenu, type BubbleMenuProps } from '@tiptap/react/menus';
import { BoldIcon, CodeIcon, ItalicIcon, StrikethroughIcon, UnderlineIcon } from 'lucide-react';
import { useState } from 'react';
import { AddTextColor } from '@/components/atoms/text-editor/add-text-color';
import { cn } from '@/lib/utils/cn';
import { AddColor } from './add-color';
import { AddLink } from './add-link';

type EditorBubbleMenuProps = Omit<BubbleMenuProps, 'children'>;

export function EditorBubbleMenu(props: EditorBubbleMenuProps) {
  const { editor } = props;
  const [isAddTextColorOpen, setIsAddTextColorOpen] = useState(false);
  const [isAddColorOpen, setIsAddColorOpen] = useState(false);
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);

  const bubbleMenuItems = [
    {
      title: 'Bold',
      icon: <BoldIcon size={16} strokeWidth={editor?.isActive('bold') ? 2.5 : 2} />,
      command: () => editor?.chain().focus().toggleBold().run(),
      isActive: () => editor?.isActive('bold'),
    },
    {
      title: 'Italic',
      icon: <ItalicIcon size={16} strokeWidth={editor?.isActive('italic') ? 2.5 : 2} />,
      command: () => editor?.chain().focus().toggleItalic().run(),
      isActive: () => editor?.isActive('italic'),
    },
    {
      title: 'Underline',
      icon: <UnderlineIcon size={18} strokeWidth={editor?.isActive('underline') ? 2.5 : 2} />,
      command: () => editor?.chain().focus().toggleUnderline().run(),
      isActive: () => editor?.isActive('underline'),
    },
    {
      title: 'Strikethrough',
      icon: <StrikethroughIcon size={16} strokeWidth={editor?.isActive('strike') ? 2.5 : 2} />,
      command: () => editor?.chain().focus().toggleStrike().run(),
      isActive: () => editor?.isActive('strike'),
    },
    {
      title: 'Code',
      icon: <CodeIcon size={18} strokeWidth={editor?.isActive('code') ? 2.5 : 2} />,
      command: () => editor?.chain().focus().toggleCode().run(),
      isActive: () => editor?.isActive('code'),
    },
  ];

  return (
    <BubbleMenu
      className="mx-auto flex w-fit items-center gap-1 rounded-xl border border-steel-100 bg-white p-1 shadow-lg dark:border-steel-600 dark:bg-steel-800"
      // tippyOptions={{
      //   duration: 100,
      //   onHidden: () => {
      //     setIsAddColorOpen(false);
      //     setIsAddTextColorOpen(false);
      //     setIsLinkPopoverOpen(false);
      //   },
      // }}
      {...props}
    >
      {bubbleMenuItems?.map((item, index) => (
        <button
          type="button"
          title={item.title}
          onClick={item.command}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
            item.isActive()
              ? 'bg-steel-100/70 dark:bg-steel-600/50'
              : 'text-steel-700 hover:bg-steel-100/80 dark:text-steel-100 hover:dark:bg-steel-700'
          )}
          key={index}
        >
          {item.icon}
        </button>
      ))}
      <span className="flex h-9 w-px bg-steel-200/60 dark:bg-steel-600" />
      <AddColor
        editor={editor}
        isOpen={isAddColorOpen}
        setIsOpen={() => {
          setIsAddTextColorOpen(false);
          setIsAddColorOpen(!isAddColorOpen);
          setIsLinkPopoverOpen(false);
          // setIsNodeSelectorOpen(false);
        }}
      />
      <AddTextColor
        editor={editor}
        isOpen={isAddTextColorOpen}
        setIsOpen={() => {
          setIsAddColorOpen(false);
          setIsAddTextColorOpen(!isAddTextColorOpen);
          setIsLinkPopoverOpen(false);
        }}
      />
      <span className="flex h-9 w-px bg-steel-200/60 dark:bg-steel-600" />
      <AddLink
        editor={editor}
        isOpen={isLinkPopoverOpen}
        setIsOpen={() => {
          setIsAddColorOpen(false);
          setIsAddTextColorOpen(false);
          setIsLinkPopoverOpen(!isLinkPopoverOpen);
        }}
      />
    </BubbleMenu>
  );
}
