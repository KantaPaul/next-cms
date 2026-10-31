# Editor Basics and Header/Footer Templates (MKT-01, MKT-02, MKT-08, MKT-09, MKT-10)

## Overview
This document details the implementation of editor history controls, canvas keyboard shortcuts, shortcut help modal, and header/footer template creation, assignment, and public resolution.

---

## 1. Editor Basics (R476, R477 / MKT-01, MKT-02)

### 1.1 Undo & Redo History Controls (MKT-01)
- **TopBar and Shared Chrome**:
  - `TopBar` in `@nextcms/editor-ui` includes visible Undo and Redo buttons (`<Undo2>` and `<Redo2>` icons).
  - Wired directly to the builder store's history state (`canUndo = history.past.length > 0`, `canRedo = history.future.length > 0`).
  - Disabled state is enforced when there are no past or future steps to traverse.
  - Clicking triggers `store.undo()` and `store.redo()`.

### 1.2 Keyboard Shortcuts & Save (MKT-02)
- **Keyboard Map & Pure Evaluator** (`packages/builder-react/src/keyboard.ts`):
  - `Mod + Z` -> Undo
  - `Mod + Shift + Z` or `Mod + Y` -> Redo
  - `Mod + S` -> Save (triggers document snapshot save / flush queue)
  - `Mod + D` -> Duplicate selected node
  - `Delete` or `Backspace` -> Delete selected node
  - `Mod + C` / `Mod + X` / `Mod + V` -> Copy, cut, paste
  - `Enter` / `Shift + Enter` -> Select child / parent block
  - `↑` / `↓` -> Previous / next block
  - `Alt + ↑` / `Alt + ↓` -> Move block up / down
  - `Escape` -> Deselect block
  - `?` or `Mod + /` -> Open shortcut help dialog
- **Typing Guard**: `isTypingTarget` ensures that typing inside inputs, textareas, selects, or editable fields never activates editor shortcuts.

### 1.3 Shortcut Help Dialog
- Exported as `ShortcutHelpDialog` in `@nextcms/editor-ui`.
- Built on top of Radix UI dialog primitive with accessible focus trapping and keyboard navigation.
- Accessible via:
  1. Header button with tooltip `Keyboard shortcuts (?)` and `<HelpCircle />` icon in TopBar and legacy editor header.
  2. Pressing `?` or `Cmd + /` (or `Ctrl + /`) anywhere on the editor canvas or frame window.

---

## 2. Header and Footer Templates (R483, R484, R485 / MKT-08, MKT-09, MKT-10)

### 2.1 Storage as Global Blocks (MKT-08)
- Header and footer templates are stored in the `global_blocks` table with `category: 'Header'` or `category: 'Footer'`.
- Edited in the visual core/Puck builder via `/dashboard/templates/globals/[id]`.
- Category input includes quick datalist suggestions for `Header`, `Footer`, and `General`.

### 2.2 Hierarchical Template Assignment (MKT-09)
Assignments are configured and resolved in order of specificity:
1. **Per Page**: `headerTemplateId` and `footerTemplateId` columns on the `pages` table, editable from the page settings sidebar.
2. **Per Locale**: `headerTemplateId` and `footerTemplateId` on `SiteCopy` inside `site_settings.translations[locale]`, editable from the locale tabs in Site Settings.
3. **Site Default**: `headerTemplateId` and `footerTemplateId` columns on `site_settings`, editable from the Navigation & Templates section in Site Settings.

### 2.3 Public Layout Fallback Rendering (MKT-10)
In `src/app/(site)/layout.tsx`:
- Detects the current page route and preview status.
- Evaluates template IDs using:
  ```ts
  const headerTemplateId = currentPage?.headerTemplateId || copy.headerTemplateId || settings.headerTemplateId || null;
  const footerTemplateId = currentPage?.footerTemplateId || copy.footerTemplateId || settings.footerTemplateId || null;
  ```
- If assigned, retrieves the template via `getGlobalBlockContent(id)` and renders it using `renderBuilderContent({ content, metadata })`.
- If unassigned or empty, seamlessly falls back to the default semantic `<header>` (with site logo, site name, and `MenuLinks`) and `<footer>` (with copyright, site description, and `MenuLinks`).

---

## 3. Verification & Testing
- Unit tests in `src/server/services/__tests__/header-footer-templates.test.ts` verify:
  - Resolution of site default header & footer templates.
  - Resolution of locale-specific template overrides.
  - Fallback to site default when locale override is omitted.
  - Precedence hierarchy: page override > locale override > site default > null fallback.
- Keyboard tests in `packages/builder-react/src/__tests__/store.test.ts` verify:
  - Key mapping for undo, redo, duplicate, delete, save (`Mod + S`), and help (`?`, `Mod + /`).
  - Action execution against the editor store and custom action handlers.
- Monorepo package typechecks (`builder-core`, `builder-react`, `editor-ui`) passing cleanly.
- Full test suite: 513 tests passing, 0 failing.
