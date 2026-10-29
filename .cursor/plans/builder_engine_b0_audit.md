# Builder engine B0 audit (R680, R681, R796, R808)

Checked against the code on 2026-10-29. Part of [custom_builder_engine_refs.plan.md](custom_builder_engine_refs.plan.md), batch B0.

## R681 — Puck API inventory

19 app files import `@measured/puck` (plus `puck.css` in `builder-editor.tsx`), and two new check files use `Render` on purpose to compare engines. Each use maps to a replacement step.

| File | Lines | Puck APIs | Replaced by |
|---|---|---|---|
| `src/builder/config.tsx` | 1,499 | `Config`, `Fields`, `Field`, `resolveData` (4), root render, `renderBlock`, `renderPanels` | ENG-18 block definitions (R697), EXT-01 to EXT-04 (R773–R776); `resolveData` → loaders (R685) |
| `src/builder/custom/index.ts` | 65 | `ComponentConfig`, `Fields` | EXT-01 `defineBlock` (R773) |
| `src/app/(site)/[[...slug]]/page.tsx` | 592 | `Render` (4), `resolveAllData` (4) | `renderDocumentWithLoaders` behind the R686 flag |
| `src/app/api/v1/pages/[slug]/route.ts` | 178 | `resolveAllData`, `Data` | `resolveDocumentData` (R685) in R686 |
| `src/app/api/v1/posts/[slug]/route.ts` | 172 | `resolveAllData`, `Data` | same |
| `.../builder/_components/builder-editor.tsx` | 503 | `Puck`, `Config`, `overrides`, `viewports`, `iframe`, `onChange`, `puck.css` | editor store (R687), iframe canvas (R689), autosave queue (R740) |
| `.../builder/_components/builder-shell.tsx` | 424 | `usePuck`/`createUsePuck`, `Drawer`, `history`, `dispatch`, `setUi`, `itemSelector` | store and commands (R687–R688), insert panel (R714) |
| `.../builder/_components/builder-chrome.tsx` | 223 | `ActionBar`, `usePuck`, `history` | chrome port (R698), undo buttons (R476 → R688) |
| `.../builder/_components/layers-panel.tsx` | 330 | `usePuck`, `dispatch`, `setUi`, `itemSelector`, iframe access | layers panel (R692) |
| `.../builder/_components/selection-card.tsx` | 319 | `usePuck`, `itemSelector` (8), `dispatch`, iframe DOM reads | overlay and floating toolbar (R689, R720) |
| `.../builder/_components/ai-dialogs.tsx` | 449 | `useGetPuck`, `dispatch`, `Data` | AI port (R700), AI assist (R730) |
| `.../builder/_components/save-global-dialog.tsx` | 188 | `useGetPuck`, `dispatch`, `appState` | builder kinds port (R699) |
| `.../builder/_components/save-template-dialog.tsx` | 120 | `useGetPuck`, `appState` | same |
| `src/builder/controls/section-inspector.tsx` | 371 | `usePuck`, `overrides`, field `onChange` (25) | inspector and field registry (R693) |
| `src/builder/controls/device-row.tsx` | 109 | `usePuck`, `viewports`, `dispatch`, `setUi` | responsive editing (R694) |
| `src/builder/controls/color-picker.tsx` | 213 | `usePuck`, `appState` | token picker (R723) |
| `src/builder/fields/contact-form-options-field.tsx` | 53 | `usePuck` | `defineField` (R783) |
| `.../contact-forms/[id]/page.tsx`, `templates/[id]/page.tsx`, `templates/globals/[id]/page.tsx` | 65, 49, 67 | `Data` type only | `BuilderDocument` type |

Stored data: 63 Puck documents (30 page contents, 6 global blocks, 18 page templates, 18 page revisions; no post canvases yet). All are flat today; nested slots are stored inline in props (Puck 0.20 `slot` fields), and no document uses legacy `zones`.

## R680 — Puck problems found in the code

Each was found in the code and its comments. Problems the team hits while editing still need to be added below with repro steps.

1. **Puck hooks throw outside a `<Puck>` provider, and store context is missing in the preview iframe.** Blocks need two code paths. Evidence: `src/builder/blocks/container.tsx:102-104` and `:189-190`. Fixed by: one renderer and store for editor and public (R684, R687).
2. **Slot functions cannot cross the server/client boundary.** Slider, Tabs, and Accordion need a `renderPanels` wrapper. Evidence: `config.tsx:160-162`. Fixed by: the renderer passes resolved panels (done in R684).
3. **Array-item slots only become drop zones when the item already has the key.** Old panels without `content` do not accept drops, and the `ensurePanelSlots` fix is commented out. Evidence: `config.tsx:182-196`. Repro: open a Tabs block saved before slots, try to drop into a tab. Fixed by: named slots in the document format (R682) and the R703 migration.
4. **Columns cannot contain Columns.** `disallow: ['Columns', 'GlobalRef']` on every column slot. Evidence: `config.tsx:666-669`. Fixed by: Container nesting rules (R690).
5. **Two inspector UIs.** The page builder wraps `Puck.Fields` in a floating card while the global block editor keeps Puck's default sidebar, so controls branch on where they render. Evidence: `controls/inspector-tab.tsx:8-9`, `controls/section-inspector.tsx:346`. Fixed by: one inspector (R693, R722).
6. **Device preview is Puck's viewport list.** A custom device row has to stay in sync with it. Evidence: `controls/device-row.tsx:18`. Fixed by: R694.
7. **Interactive blocks cannot be edited in their real layout.** Tabs, Accordion, and Slider stack every panel in edit mode. Evidence: `blocks/interactive.tsx:131, 281, 429`. Fixed by: canvas overlays (R689) with panel switching.
8. **Public rendering depends on the editor library.** The site and `/api/v1` call `Render` and `resolveAllData`, so data fetching is tied to Puck's config. Fixed by: R684–R686.
9. **Selection and layers read the iframe DOM directly.** `selection-card.tsx` and `layers-panel.tsx` query iframe elements to place UI, which breaks when Puck changes its markup. Fixed by: overlay layer owned by the engine (R689).

### Problems reported by the team

Not yet received. Add each as: what you did, what happened, what you expected, how often.

## R796 — Non-goals for the rewrite

- No real-time co-editing with OT or CRDT in the first release; presence and block locks only (R729).
- No native mobile editor app; the web editor works on tablets (R735).
- No support for non-React hosts; packages target React 18 and 19.
- No freeform absolute positioning as the default layout (opt-in only, CFG-11).
- No headless-only package without the React renderer in the first release.
- No pixel-perfect parity with Elementor, Webflow, or Framer; parity target is today's Puck editor plus the UXE steps.
- No new drag or state library; dnd-kit, React context, and `useSyncExternalStore` only.

## R808 — Migration cost for other plans that assume Puck

| Step | Status | What changes |
|---|---|---|
| R059 P5-12 Load Puck components from `src/builder/custom/` | completed | Re-register custom blocks with `defineBlock` (R773); small |
| R150 V6-02 VideoLibrary Puck block | completed | Loader already ported (R685); block definition ported in R697; small |
| R393 BLD-01 audit of the Puck builder | pending | Fold into this audit; no separate work |
| R395 BLD-03 Container with a Puck slot | pending (block exists) | `blocks/container.tsx` already renders through the new renderer; only its config entry moves (R697); small |
| R400 BLD-08 resize handles in Puck | pending | Build once as R695; drop the Puck version; saves work |
| R413 BLD-21 dynamic content audit of Puck APIs | pending | Audit loaders (R685) and the R682 format instead; same size |
| R476 MKT-01 undo and redo on Puck history | pending | Done by R688 and R691; drop the Puck version |
| R483 MKT-08 header and footer templates in Puck | pending | Build on builder kinds (R699); medium |
| R488 MKT-13 404 template in Puck | pending | Same as R483; small |
| R575, R578 QRY-05, QRY-08 Query Loop slots | pending | Use named slots and a loader (R685); build after Gate 34 to avoid doing it twice |
| R435, R436 RFB-01, RFB-02 adapter audit and contract | pending | Replaced by EXT-01 to EXT-04 (R773–R776) |

Recommendation: freeze new Puck-only work (R400, R476, R483, R488, R575, R578) until Gate 34 (R708), then build each on the new engine.
