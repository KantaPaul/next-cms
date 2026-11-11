# Developer Guide: Typed React Component Bridge (RFB-22 / R456)

The **Typed React Component Bridge** lets you bring your existing React components directly into the CMS visual editor without rewriting them as separate blocks or duplicating rendering logic.

---

## Quick Start: 3 Steps to Register a React Component

### 1. Create or Choose Your React Component

Write an ordinary, clean React component:

```tsx
// src/components/ui/card-callout.tsx
import type { ReactNode } from 'react';

export type CardCalloutProps = {
  title: string;
  tone?: 'info' | 'success' | 'warning';
  badge?: string;
  children?: ReactNode;
};

export function CardCallout({
  title,
  tone = 'info',
  badge,
  children,
}: CardCalloutProps) {
  const borderColors = {
    info: 'border-blue-500 bg-blue-50',
    success: 'border-green-500 bg-green-50',
    warning: 'border-amber-500 bg-amber-50',
  };

  return (
    <div className={`rounded-xl border-l-4 p-6 shadow-sm ${borderColors[tone]}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {badge && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white text-gray-700 shadow-xs">
            {badge}
          </span>
        )}
      </div>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  );
}
```

### 2. Wrap with `defineReactComponent`

Register it with a typed Zod props schema in `src/builder/custom/`:

```tsx
// src/builder/custom/card-callout-block.tsx
'use client';

import { defineReactComponent, slot } from '@nextcms/builder-core';
import { CardCallout, type CardCalloutProps } from '@/components/ui/card-callout';
import { z } from 'zod';

export const CardCalloutBlock = defineReactComponent<CardCalloutProps>({
  name: 'CardCallout',
  label: 'Callout Card',
  category: 'Marketing',
  keywords: ['callout', 'card', 'notice', 'highlight'],
  description: 'Highlight card with colored accent bar, badge, and content slot.',
  
  // Strict Zod schema for serializable props
  props: z.object({
    title: z.string().describe('Card title').default('Important Note'),
    tone: z.enum(['info', 'success', 'warning']).describe('Visual tone').default('info'),
    badge: z.string().optional().describe('Top right badge text'),
  }),

  // Define named drop zones (slots)
  slots: {
    content: slot({ allow: ['RichText', 'Button', 'Image'] }),
  },
  // Automatically passes the evaluated content slot as `children: ReactNode`
  childrenSlot: 'content',

  // Named presets / variants shown in the insert panel
  variants: {
    tip: {
      label: 'Success Tip',
      props: { tone: 'success', title: 'Pro Tip', badge: 'Recommended' },
    },
    alert: {
      label: 'Warning Alert',
      props: { tone: 'warning', title: 'Attention Required' },
    },
  },

  component: CardCallout,
});
```

### 3. Add to Custom Registry

Export it in `src/builder/custom/index.ts`:

```tsx
// src/builder/custom/index.ts
import { CardCalloutBlock } from './card-callout-block';

export const customBlockDefinitions = [
  CardCalloutBlock,
];

export const customComponents = {
  CardCallout: CardCalloutBlock.render,
};
```

Your component is now available in the editor's insert panel, with auto-generated controls, presets, error boundary isolation, and public site rendering!

---

## Schema Helpers & Controls

The bridge supports schema wrappers to unlock visual editor features:

| Schema Helper | Generated Inspector Control |
|---|---|
| `z.string().describe('Label')` | Text input with label and helper text |
| `z.number().min(0).max(100)` | Numeric control with boundaries |
| `z.boolean()` | Toggle switch |
| `z.enum(['a', 'b', 'c'])` | Select dropdown with auto-labeled options |
| `z.union([z.literal('sm'), z.literal('lg')])` | Select dropdown from literal union |
| `responsive(z.number())` | Multi-device override (`widescreen`, `desktop`, `laptop`, `tablet_extra`, `tablet`, `mobile_extra`, `mobile`) |
| `token('color')` | Visual theme color picker linked to design tokens |
| `dynamic(z.string())` | Dynamic content binding picker (post title, author, etc.) |
| `translatable(z.string())` | Per-locale multi-language text field |

---

## Server Component vs Client Component Rules

1. **Document Props Must Be Serializable**:
   - Only strings, numbers, booleans, arrays, and plain objects can be saved in pages.
   - Do not accept functions (like `onClick`) as document props.
2. **Interactive Behavior Belongs in Client Components**:
   - If your component has internal state (`useState`), event listeners, or animations, add `'use client'` at the top of the component file.
3. **Data Fetching via Server Loaders**:
   - If your component needs server-side database access or private APIs, use the `loader` property on `defineReactComponent` rather than querying directly inside render.

---

## Testing & Previewing in Development

Use `ReactComponentPreview` to test your component harness with variants and simulated slots:

```tsx
import { ReactComponentPreview } from '@nextcms/builder-core';
import { CardCalloutBlock } from './card-callout-block';

export function DevHarness() {
  return (
    <ReactComponentPreview
      options={CardCalloutBlock}
      initialVariant="tip"
      mockProps={{ title: 'Harness Test Title' }}
    >
      <p>This is mock children content inside the preview frame.</p>
    </ReactComponentPreview>
  );
}
```

---

## Error Boundary Protection

If an adapted component throws an error:
- **In Editor Mode**: An in-canvas card displays the component name and error message without crashing the editor.
- **In Published Mode**: The error is caught safely without taking down the entire website page.
