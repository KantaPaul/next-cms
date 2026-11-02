# Audit: React Component Registry, Boundaries, and Pipeline (RFB-01 / R435)

## Overview

This audit reviews the component registry architecture, Next.js Server/Client component boundaries, inspector controls generation, rendering pipeline, document format, and developer extension points in preparation for the Typed React Component Bridge.

---

## 1. Current Component Architecture

### 1.1 Registries & Definitions
- **`@nextcms/builder-core` (`defineBlock`, `createBuilderConfig`)**:
  - Provides the fundamental `BlockDefinition` contract containing `type`, `label`, `schema` (Zod), `fields`, `defaults`, `slots`, `presets`, `loader`, and `render`.
  - Generates editor `BlockSchema` via `toBlockSchema(definition)`.
  - Composability: combines traits, presets, and slot definitions into unified schemas.
- **CMS Application Registries**:
  - `src/builder/blocks/registry.ts`: Maps block types to their React rendering components (`getBlockComponents()`).
  - `src/builder/definitions/native.tsx` & `src/builder/definitions/index.ts`: Native block definitions and category groupings (`pageDefinitions`, `pageBlockGroups`).
  - `src/builder/custom/`: Local developer extension directory for project-specific blocks.

---

## 2. Server Component vs. Client Component Boundaries

### 2.1 Next.js App Router Constraints
- **React Server Components (RSC)**:
  - Run exclusively on the server (SSR / SSG).
  - Can be async functions, access server-only APIs (`cookies()`, headers, private database connections).
  - **Cannot** use interactive hooks (`useState`, `useEffect`, `useCallback`) or attach event handlers (`onClick`, `onChange`).
  - **Cannot** access browser globals (`window`, `document`, `localStorage`).
- **Client Components (`'use client'`)**:
  - Hydrate in the browser and provide interactivity, animations, and state.
  - Can receive props from Server Components only if those props are **serializable JSON**.

### 2.2 CMS Page Documents & Persistence
- Stored pages in the database (`pages.content`, `posts.content`) are serialized JSON (`BuilderDocument` or legacy Puck data).
- **Hard Rule**: Document props must be JSON-serializable primitives (strings, numbers, booleans, arrays, plain objects, null).
- **Prohibited in Document Props**:
  - Event handler functions (`onClick`, `onSubmit`).
  - JSX nodes / React elements directly as prop values.
  - Class instances (`new Date()`, `RegExp`, `Map`, `Set`).
  - Promises or async functions.
- **Solution via Bridge**:
  - Interactive event handling lives strictly inside Client Components (`'use client'`).
  - Server-side data requirements are handled through `BlockDefinition.loader` functions.
  - Custom React components are validated by `validateComponentRegistration` to ensure non-serializable types are caught early with actionable remediation advice.

---

## 3. Inspector Controls & Schema Reflection

### 3.1 Field Generation from Zod
- `fieldFromZod` inspects Zod prop schemas and generates appropriate inspector controls:
  - `z.string()` → text field (or textarea if multiline).
  - `z.number()` → numeric input with min/max/step.
  - `z.boolean()` → toggle switch.
  - `z.enum([...])` & `z.union([z.literal(...), ...])` → select dropdown.
  - `responsive(...)` → per-device responsive override control (desktop, tablet, mobile).
  - `token('color')` → design token color picker.
  - `dynamic(...)` → CMS dynamic data binding picker.
  - `translatable(...)` → per-locale translation field.
- **Developer Overrides**:
  - The adapter contract allows developers to supply explicit `fields` in `ReactComponentBridgeOptions` to override or customize auto-generated controls.

---

## 4. Rendering Pipeline & Slot Handling

### 4.1 Document Rendering (`renderDocument` / `BuilderRenderer`)
- Traverses the node tree from `rootSlot`.
- Resolves dynamic content bindings per item context.
- Passes slot render functions (`SlotRender`) for every drop zone.
- **Bridge Slot Adaptation**:
  - When adapting standard React components, components usually expect `children: ReactNode`.
  - The React Component Bridge evaluates the configured `childrenSlot` (defaulting to `children` or `content`) and passes the rendered `ReactNode` directly as `children`.
  - Named slots remain accessible as functions or renderable nodes.

### 4.2 Error Boundary Isolation
- Custom React components created by developers or third parties may throw runtime errors.
- The React Component Bridge wraps every component in a `ComponentErrorBoundary`.
- In editor mode (`editing: true`), runtime errors render a clear in-canvas warning card detailing the component name and exception message, preventing the entire editor canvas from crashing.
- In public published rendering, it fails safely without taking down the entire website page.

---

## 5. Export Portability & Document Format

- `packages/builder-core/src/converter.ts` provides bidirectional conversion between legacy Puck structures and standard `BuilderDocument`.
- `validateDocument` and `migrateDocument` ensure that saved pages retain backward compatibility without relying on undocumented runtime globals.

---

## Conclusion & Architectural Readiness

The typed React component bridge satisfies the key differentiator of the CMS:
1. Developers write standard, clean React components once using their normal workflow.
2. Components are registered via `defineReactComponent` with a strict Zod prop schema.
3. Editor controls, presets, slots, and diagnostics are generated automatically.
4. Server/Client boundaries are enforced cleanly.
