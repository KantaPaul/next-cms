import { notFound } from 'next/navigation';
import { metaObject } from '@/lib/utils/metadata';
import { EditorUIGalleryClient } from './gallery-client';

export const metadata = metaObject('Editor UI gallery');

/** Dev-only gallery of every @nextcms/editor-ui component and state (B15 E1). */
export default function EditorUIGalleryPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <EditorUIGalleryClient />;
}
