'use client';

import { EditorUIGallery } from '@nextcms/editor-ui/gallery';
// Relative until the app depends on @nextcms/editor-ui and can import '@nextcms/editor-ui/editor-ui.css'.
import '../../../../../../../packages/editor-ui/dist/editor-ui.css';

export function EditorUIGalleryClient() {
  return <EditorUIGallery />;
}
