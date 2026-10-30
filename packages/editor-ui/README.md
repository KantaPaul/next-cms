# @nextcms/editor-ui

Shared editor UI primitives for NextCMS page builder and dashboard builder.

## Installation

```bash
pnpm add @nextcms/editor-ui
```

## Usage

```tsx
import { EditorShell, TopBar, Panel, Button } from '@nextcms/editor-ui';
import '@nextcms/editor-ui/tokens.css';

function MyEditor() {
  return (
    <EditorShell
      topBar={<TopBar title="My Editor" />}
      canvas={<div>Canvas content</div>}
    />
  );
}
```

## Components

### Primitives
- `Button`, `Input`, `Textarea`, `Switch`, `Tabs`, `Tooltip`, `Popover`, `Dialog`, `Skeleton`, `Label`, `Select`

### Shell
- `EditorShell` — main layout container with topBar, library, canvas, inspector, statusBar slots
- `TopBar` — editor top bar with title, save status, undo/redo, device toggle, preview/publish
- `Panel` — resizable, collapsible side panel
- `Breadcrumb` — breadcrumb navigation
- `StatusBar` — bottom status bar
- `CommandPalette` — Cmd+K command palette

### Library & Layers
- `LibraryPanel` — searchable, categorized widget library
- `LayersTree` — tree view with visibility/lock toggles

### Inspector
- `InspectorField` — labeled field wrapper with description and error

### Overlays & Feedback
- `ResizeHandles` — resize handle overlay
- `useKeyboardMove` — keyboard move/resize hook
- `EmptyState`, `ErrorState`, `LoadingSkeleton` — feedback states
- `LiveAnnouncer` — screen reader announcements

### Utilities
- `cn` — class name merger (clsx + tailwind-merge)

## Theming

The package uses `--ne-*` CSS custom properties. Light theme is on `:root`, dark on `.dark`. Import `tokens.css` to get the default theme.

## Design tokens

See `src/tokens.css` for the full token list. Key tokens:
- Colors: `--ne-bg`, `--ne-surface`, `--ne-border`, `--ne-text`, `--ne-text-muted`, `--ne-primary`, `--ne-success`, `--ne-warning`, `--ne-danger`
- Spacing: `--ne-spacing-1` through `--ne-spacing-8`
- Radius: `--ne-radius-sm`, `--ne-radius-md`, `--ne-radius-lg`
- Typography: `--ne-font-ui`, `--ne-font-mono`

## License

Private — part of the NextCMS monorepo.