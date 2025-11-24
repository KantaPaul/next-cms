'use client';

import Highlight from '@tiptap/extension-highlight';
import TiptapLink from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import TiptapUnderline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Text } from '@/components/atoms/content';
import { cn } from '@/lib/utils/cn';

type TextEditorViewerProps = {
  content: string;
  className?: string;
  placeholder?: string;
};

export function TextEditorViewer({
  content,
  className,
  placeholder = '-- --',
}: TextEditorViewerProps) {
  const editor = useEditor(
    {
      content,
      editable: false,
      immediatelyRender: true,
      editorProps: {
        attributes: {
          class:
            'prose dark:prose-invert prose-sm sm:prose-base lg:prose-4xl [&_h1]:text-4xl [&_h2]:text-3xl [&_h3]:text-2xl [&_h4]:text-xl [&_h5]:text-lg [&_h6]:text-base focus:outline-none [&_ol]:list-decimal [&_ol]:ml-4 max-w-none text-steel-700 dark:text-steel-200',
        },
      },
      extensions: [
        StarterKit.configure({
          paragraph: {
            HTMLAttributes: {
              class: 'leading-loose my-6 text-sm',
            },
          },
          bulletList: {
            HTMLAttributes: {
              class: 'list-disc leading-relaxed pl-7 my-11 text-sm',
            },
          },
          orderedList: {
            HTMLAttributes: {
              class: 'list-decimal leading-relaxed pl-7 my-11 text-sm',
            },
          },
          listItem: {
            HTMLAttributes: {
              class: 'leading-normal -mt-5 text-sm',
            },
          },
          heading: {
            HTMLAttributes: {
              class: 'my-6 font-semibold',
            },
          },
          codeBlock: {
            HTMLAttributes: {
              class:
                'rounded-md bg-steel-100 p-6 font-mono font-medium text-steel-600 text-sm dark:bg-steel-600/40 dark:text-steel-200',
            },
          },
          code: {
            HTMLAttributes: {
              class:
                'rounded bg-steel-100 px-1.5 py-1 font-mono font-medium text-steel-700 dark:bg-steel-600 dark:text-steel-100 text-sm',
              spellcheck: 'false',
            },
          },
        }),
        TiptapLink.configure({
          HTMLAttributes: {
            class:
              'underline underline-offset-[4px] text-[#2188db] hover:text-[#2188db]/80 transition-colors cursor-pointer',
          },
          openOnClick: false, // Disable clicking in read-only mode
        }),
        Highlight.configure({
          multicolor: true,
        }),
        TiptapUnderline,
        TextStyle,
        Color,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
      ],
    },
    [content]
  );

  if (!content) {
    return <Text>{placeholder}</Text>;
  }

  return (
    <div className={cn('tiptap-content', className)}>
      <EditorContent editor={editor} />
    </div>
  );
}
