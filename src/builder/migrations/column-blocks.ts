/**
 * Column block migration (Stage 2): pure, idempotent, deterministic functions
 * converting legacy column slots (`left/center/right`, `col1..6`, `column1..4`)
 * on `Columns`, `HeaderBar`, `HeaderColumns`, and `FooterColumns` into real
 * `Column` blocks across all three stored formats:
 * - `migrateZonesColumns`: Puck zones (`${parentId}:left`, `${parentId}:col1`, `${parentId}:column1`)
 * - `migrateInlineColumns`: inline slot arrays on `props` (`props.left = [...]`, `props.column1 = [...]`)
 * - `migrateDocumentColumns`: `BuilderDocument` (`node.slots`)
 * - `migratePuckColumns`: auto-detects zones vs inline slot arrays on `PuckData`
 * - `migrateColumnBlocks`: auto-detects `BuilderDocument`, `PuckData`, or `PuckItem[]`
 */

export {
  COLUMN_PARENT_TYPES,
  type ColumnSpec,
  buildColumnSpecsForParent,
  deterministicColumnId,
  migrateColumnBlocks,
  migrateDocumentColumns,
  migrateInlineColumns,
  migratePuckColumns,
  migrateZonesColumns,
} from '@nextcms/builder-core';
