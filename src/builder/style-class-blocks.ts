/**
 * Block types that support style classes (KRK-01, tier A). The renderer puts
 * a block's classes on its outer `Section` wrapper (Container: on its layout
 * element; Column: on its own wrapper). The inspector shows the class bar
 * only for these types, and `classes-render.test.tsx` checks each one
 * renders its classes. Tier B adds the remaining blocks in Phase 2.
 */
export const STYLE_CLASS_BLOCK_TYPES = [
  'Container',
  'Columns',
  'Column',
  'Heading',
  'RichText',
  'Button',
  'Image',
  'Icon',
  'Divider',
  'Spacer',
] as const;

export type StyleClassBlockType = (typeof STYLE_CLASS_BLOCK_TYPES)[number];

const SUPPORTED = new Set<string>(STYLE_CLASS_BLOCK_TYPES);

export function supportsStyleClasses(type: string): boolean {
  return SUPPORTED.has(type);
}
