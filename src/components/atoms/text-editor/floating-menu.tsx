// import { FloatingMenu, type FloatingMenuProps } from '@tiptap/react';

import { FloatingMenu, type FloatingMenuProps } from '@tiptap/react/menus';
import {
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrderedIcon,
  TextIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type EditorFloatingMenuProps = Omit<FloatingMenuProps, 'children'>;

export function EditorFloatingMenu(props: EditorFloatingMenuProps) {
  const { editor } = props;

  const floatingMenuItems = [
    {
      title: 'Text',
      description: 'Start writing with plain text',
      icon: <TextIcon strokeWidth={1.5} />,
      command: () =>
        editor?.chain().focus().toggleNode('paragraph', 'paragraph').run(),
      isActive: () => editor?.isActive('paragraph'),
    },
    {
      title: 'Heading 1',
      description: 'Large Section Heading',
      icon: <Heading1Icon strokeWidth={1.5} />,
      command: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor?.isActive('heading', { level: 1 }),
    },
    {
      title: 'Heading 2',
      description: 'Medium Section Heading',
      icon: <Heading2Icon strokeWidth={1.5} />,
      command: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor?.isActive('heading', { level: 2 }),
    },
    {
      title: 'Heading 3',
      description: 'Small Section Heading',
      icon: <Heading3Icon strokeWidth={1.5} />,
      command: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor?.isActive('heading', { level: 3 }),
    },
    {
      title: 'Bullet List',
      description: 'Create a bullet list',
      icon: <ListIcon strokeWidth={1.5} />,
      command: () => editor?.chain().focus().toggleBulletList().run(),
      isActive: () => editor?.isActive('bulletList'),
    },
    {
      title: 'Ordered List',
      description: 'Create an ordered list',
      icon: <ListOrderedIcon strokeWidth={1.5} />,
      command: () => editor?.chain().focus().toggleOrderedList().run(),
      isActive: () => editor?.isActive('orderedList'),
    },
    {
      title: 'Code Block',
      description: 'Create a code snippet',
      icon: <CodeIcon strokeWidth={1.5} />,
      command: () => editor?.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor?.isActive('codeBlock'),
    },
  ];

  return (
    <FloatingMenu
      className="flex w-72 flex-col gap-1 rounded-md border border-steel-200 bg-white p-2 dark:border-steel-600 dark:bg-steel-800"
      // tippyOptions={{
      //   duration: 100,
      //   placement: 'bottom-start',
      // }}
      {...props}
    >
      {floatingMenuItems?.map((item, index) => (
        <button
          type="button"
          onClick={item.command}
          className={cn(
            'flex items-center gap-2.5 p-1.5 text-sm text-steel-700 transition-all dark:text-steel-100',
            item.isActive()
              ? 'bg-steel-100/50 dark:bg-steel-600/50'
              : 'hover:bg-steel-50/80 hover:dark:bg-steel-700'
          )}
          key={index}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded border border-steel-100 bg-steel-50/30 text-left text-steel-500 dark:border-steel-600/30 dark:bg-steel-700 dark:text-steel-300">
            {item.icon}
          </span>
          <span>
            <span className="block text-left font-medium">{item.title}</span>
            <span className="block text-left text-steel-500 text-xs dark:text-steel-400">
              {item.description}
            </span>
          </span>
        </button>
      ))}
    </FloatingMenu>
  );
}
