'use client';

import Highlight from '@tiptap/extension-highlight';
import TiptapLink from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import TiptapUnderline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { FieldError, Label } from '@/components/atoms/forms';
// import { FieldError } from '@/components/atoms/forms/helper/field-error-text';
import { borderColor } from '@/components/atoms/table-grid';
import { EditorBubbleMenu } from '@/components/atoms/text-editor/bubble-menu';
import { cn } from '@/lib/utils/cn';
import { Toolbar } from './toolbar';

export interface TextEditorProps {
  value?: string;
  label?: string;
  error?: string;
  errorClassName?: string;
  isRequired?: boolean;
  onChange?: (html: string) => void;
}

export function TextEditor({
  value,
  label,
  error,
  isRequired,
  errorClassName,
  onChange,
}: TextEditorProps) {
  const editor = useEditor({
    content: value,
    immediatelyRender: true,
    onUpdate: ({ editor }) => {
      if (typeof onChange === 'function') {
        const textContent = editor.getText().trim();
        onChange(textContent ? editor.getHTML() : '');
      }
    },
    editorProps: {
      attributes: {
        class:
          'prose dark:prose-invert prose-sm sm:prose-base lg:prose-4xl [&_h1]:text-4xl [&_h2]:text-3xl [&_h3]:text-2xl [&_h4]:text-xl [&_h5]:text-lg [&_h6]:text-base p-5 focus:outline-none [&_ol]:list-decimal [&_ol]:ml-4 max-w-none text-steel-700 dark:text-steel-200',
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
  });

  if (!editor) {
    return null;
  }

  return (
    <div className={cn()}>
      {label && (
        <Label>
          {label} {isRequired && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Toolbar editor={editor} />
      <EditorBubbleMenu editor={editor} />
      <EditorContent
        editor={editor}
        className={cn('editor-content max-h-96 overflow-y-scroll rounded-b-lg border', borderColor)}
      />
      {error && <FieldError error={error} className={cn('mt-2', errorClassName)} />}
    </div>
  );
}
