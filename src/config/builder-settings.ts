/**
 * Site-level builder switches, stored in `site_settings.builder_settings`.
 *
 * `styleClasses` (KRK-01): persisted style classes. Off by default; while off,
 * pages render without class names or class CSS, the editor hides the class
 * tools, and classes cannot be created or edited. Turning it off keeps the
 * classes and the blocks' `classIds`, so turning it on again restores them.
 */
export type BuilderSettings = {
  styleClasses: boolean;
};

export const DEFAULT_BUILDER_SETTINGS: BuilderSettings = { styleClasses: false };

export function normalizeBuilderSettings(value: unknown): BuilderSettings {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return { styleClasses: raw.styleClasses === true };
}
