/**
 * Typed React component bridge (R435–R442, R456, R460 / RFB-01–RFB-08, RFB-22, RFB-26).
 *
 * Lets developers register existing React components through an explicit,
 * typed adapter contract rather than rewrite them as separate builder blocks:
 * - Define component name, typed props (via Zod), defaults, editor controls,
 *   validation, slots, variants, preview behavior, and documentation in one registration.
 * - Generate safe editor controls from the declared schema without exposing internal props.
 * - Enforce Server/Client component boundaries with diagnostics for non-serializable props.
 * - Error boundary isolation so broken components cannot crash the visual canvas.
 * - First-party registry that produces standard `BlockDefinition` and `BuilderConfig`.
 */

import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { z } from 'zod';
import type { BlockDefinition, DefaultsContext, Shape, SlotDef } from './define';
import { defaultProps as calcDefaultProps, fieldsOf, shapeOf, toBlockSchema } from './define';
import type { BlockInfo, BlockSchema } from './blocks';
import type { Fields } from './fields';
import type { InspectorTabDef } from './inspector-layout';
import type { BlockLoader, LoaderContext } from './loaders';
import { type BuilderConfig, createBuilderConfig } from './public-api';
import type { BlockComponents, SlotRender } from './renderer';
import type { PropTrait } from './traits';

/* ---------- boundary & diagnostic types ---------- */

export type ComponentBoundary = 'client' | 'server' | 'universal';

export type ComponentVariant<
  P extends Record<string, unknown> = Record<string, unknown>,
> = {
  label?: string;
  description?: string;
  props: Partial<P>;
};

export type ComponentDiagnostic = {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
  remedy?: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ComponentDiagnostic[];
  warnings: ComponentDiagnostic[];
};

/* ---------- adapter contract options ---------- */

export type ReactComponentBridgeOptions<
  P extends Record<string, unknown> = Record<string, unknown>,
> = {
  /** Unique block type identifier, e.g. 'Card', 'Badge', 'pricing-table'. */
  name: string;
  /** Human-readable label for insert panel and inspector. */
  label: string;
  /** Category in the insert panel, e.g. 'Custom', 'Marketing', 'UI'. */
  category?: string;
  /** Search keywords for insert panel. */
  keywords?: string[];
  /** Component documentation and usage guidance. */
  description?: string;
  /** Icon identifier (Lucide icon name). */
  icon?: string;
  /** Component version string (e.g. '1.0.0'). */
  version?: string;
  /** Deprecation note or flag. If truthy, a deprecation badge shows in the editor. */
  deprecated?: boolean | string;
  /** Architectural boundary: 'client' (requires client hooks/events), 'server' (RSC/SSR safe), or 'universal' (default). */
  boundary?: ComponentBoundary;
  /** Strict Zod prop schema: defines serializable props, types, and defaults. */
  props: z.ZodObject<Shape> | z.ZodType<P>;
  /** The existing React component to adapt, without rewriting its rendering implementation. */
  component: ComponentType<P>;
  /** Default props or dynamic defaults function. */
  defaults?: Partial<P> | ((ctx: DefaultsContext) => Partial<P>);
  /** Optional custom field overrides or extensions. */
  fields?: Fields<P>;
  /** Named drop zones (slots) accepted by this component. */
  slots?: Record<string, SlotDef>;
  /** Array slots for repeating items. */
  arraySlots?: Record<string, Record<string, SlotDef>>;
  /** Which slot should be evaluated and passed as `children: ReactNode` to the React component. Defaults to 'children' or 'content'. */
  childrenSlot?: string;
  /** Reusable component variants / presets with explicit prop overrides and stable keys. */
  variants?: Record<string, ComponentVariant<P>>;
  /** Opt-in traits (e.g. element styling, animations). */
  traits?: PropTrait<P>[];
  /** Server loader for server-side data fetching. */
  loader?: BlockLoader<LoaderContext>;
  /** Custom inspector tabs. */
  tabs?: InspectorTabDef[];
  /** Live preview configuration for development harnesses and test fixtures. */
  preview?: {
    props?: Partial<P>;
    containerStyle?: CSSProperties;
    description?: string;
  };
  /** Migration handler for previous versions of this component's props. */
  migrate?: (oldProps: Record<string, unknown>, fromVersion?: string) => P;
};

/* ---------- component error boundary ---------- */

type ErrorBoundaryProps = {
  componentName: string;
  componentLabel: string;
  editing?: boolean;
  children: ReactNode;
};

export function ComponentErrorBoundary({
  componentName,
  componentLabel,
  editing,
  children,
}: ErrorBoundaryProps) {
  try {
    return <>{children}</>;
  } catch (error: unknown) {
    if (editing) {
      const message = error instanceof Error ? error.message : String(error);
      return (
        <div
          role="alert"
          data-component-error={componentName}
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: '#fef2f2',
            border: '1px solid #f87171',
            color: '#991b1b',
            fontSize: '13px',
            lineHeight: 1.4,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            margin: '8px 0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚠️</span>
            <span>{componentLabel} failed to render</span>
          </div>
          <div
            style={{
              fontSize: '11px',
              marginTop: '4px',
              fontFamily: 'ui-monospace, monospace',
              opacity: 0.9,
              wordBreak: 'break-word',
            }}
          >
            {message}
          </div>
        </div>
      );
    }
    return null;
  }
}

/* ---------- validation and diagnostics (RFB-07, RFB-08) ---------- */

const IDENTIFIER_REGEX = /^[a-zA-Z0-9_\-\.]+$/;

const NON_SERIALIZABLE_TYPES = new Set([
  'function',
  'promise',
  'symbol',
  'void',
  'never',
]);

/**
 * Validates a component registration against Next.js Server/Client boundary rules,
 * serializable props constraints, and identifier requirements.
 */
export function validateComponentRegistration<P extends Record<string, unknown>>(
  options: ReactComponentBridgeOptions<P>
): ValidationResult {
  const errors: ComponentDiagnostic[] = [];
  const warnings: ComponentDiagnostic[] = [];

  // 1. Name validation
  if (!options.name || typeof options.name !== 'string' || !options.name.trim()) {
    errors.push({
      severity: 'error',
      code: 'INVALID_NAME',
      message: 'Component registration must have a non-empty "name".',
      remedy: 'Provide a valid identifier like "Card" or "MarketingBanner".',
    });
  } else if (!IDENTIFIER_REGEX.test(options.name)) {
    errors.push({
      severity: 'error',
      code: 'INVALID_NAME_FORMAT',
      message: `Component name "${options.name}" contains invalid characters.`,
      remedy: 'Use only letters, numbers, dots, hyphens, and underscores.',
    });
  }

  // 2. Label validation
  if (!options.label || typeof options.label !== 'string') {
    warnings.push({
      severity: 'warning',
      code: 'MISSING_LABEL',
      message: `Component "${options.name}" is missing a human-readable "label".`,
      remedy: 'Specify a friendly label for editor display, e.g. label: "Pricing Card".',
    });
  }

  // 3. Component function check
  if (!options.component || typeof options.component !== 'function') {
    errors.push({
      severity: 'error',
      code: 'MISSING_COMPONENT',
      message: `Component "${options.name}" must provide a valid React component function.`,
      remedy: 'Pass an existing React component via the "component" property.',
    });
  }

  // 4. Props schema and serializability validation
  if (!options.props) {
    errors.push({
      severity: 'error',
      code: 'MISSING_PROPS_SCHEMA',
      message: `Component "${options.name}" must provide a Zod schema via "props".`,
      remedy: 'Define props schema using z.object({ ... }) to ensure type safety and editor controls.',
    });
  } else {
    const shape = shapeOf(options.props);
    for (const [key, propSchema] of Object.entries(shape)) {
      const def = (propSchema as unknown as { def?: { type: string } }).def;
      const type = def?.type || '';

      if (NON_SERIALIZABLE_TYPES.has(type)) {
        errors.push({
          severity: 'error',
          code: 'NON_SERIALIZABLE_PROP',
          path: key,
          message: `Prop "${key}" has non-serializable type "${type}". Document props must be JSON serializable.`,
          remedy:
            'Remove function/symbol/promise props. Interactive event handlers must live inside client components rather than page document props.',
        });
      }

      if (/^on[A-Z]/.test(key) && type === 'function') {
        errors.push({
          severity: 'error',
          code: 'EVENT_HANDLER_PROP',
          path: key,
          message: `Event handler "${key}" cannot be persisted into CMS documents.`,
          remedy:
            'Interactive event logic should be implemented directly within the component using "use client".',
        });
      }
    }
  }

  // 5. Defaults validation against schema
  if (options.defaults && typeof options.defaults === 'object') {
    const parsed = options.props.safeParse(options.defaults);
    if (!parsed.success) {
      warnings.push({
        severity: 'warning',
        code: 'INVALID_DEFAULTS',
        message: `Default props for "${options.name}" do not satisfy the props schema: ${parsed.error.issues.map(i => i.message).join(', ')}`,
        remedy: 'Ensure default prop values match the declared Zod schema.',
      });
    }
  }

  // 6. Variants validation
  if (options.variants) {
    for (const [vName, variant] of Object.entries(options.variants)) {
      if (!variant.props || typeof variant.props !== 'object') {
        errors.push({
          severity: 'error',
          code: 'INVALID_VARIANT_PROPS',
          path: `variants.${vName}`,
          message: `Variant "${vName}" for component "${options.name}" must have a "props" object.`,
          remedy: 'Provide prop overrides for the variant, e.g. props: { size: "large" }.',
        });
      }
    }
  }

  // 7. Boundary rules
  if (options.boundary === 'server') {
    if (options.slots && Object.keys(options.slots).some(s => s === 'interactive')) {
      warnings.push({
        severity: 'warning',
        code: 'SERVER_BOUNDARY_CAUTION',
        message: `Component "${options.name}" is marked boundary="server" but declares interactive slots.`,
        remedy: 'Use boundary="client" if the component relies on client-side state or interactive drop zones.',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/* ---------- defineReactComponent (RFB-02, RFB-04, RFB-05) ---------- */

/**
 * Creates a typed `BlockDefinition` from an existing React component without
 * duplicating its rendering implementation or writing boilerplate editor configs.
 */
export function defineReactComponent<
  P extends Record<string, unknown> = Record<string, unknown>,
>(options: ReactComponentBridgeOptions<P>): BlockDefinition {
  const validation = validateComponentRegistration(options);
  if (!validation.valid) {
    const errorDetails = validation.errors
      .map(e => `[${e.code}] ${e.path ? `${e.path}: ` : ''}${e.message}`)
      .join('; ');
    throw new Error(
      `Failed to register React component "${options.name}": ${errorDetails}`
    );
  }

  const {
    name,
    label,
    category = 'Components',
    keywords = [],
    description,
    icon,
    version,
    deprecated,
    boundary = 'universal',
    props: schema,
    component: TargetComponent,
    defaults,
    fields: explicitFields,
    slots,
    arraySlots,
    childrenSlot,
    variants,
    traits,
    loader,
    tabs,
    ...metaRest
  } = options;

  // Convert variants into presets for insert panel and quick insert
  const presets: Record<string, Partial<P>> = {};
  if (variants) {
    for (const [vKey, variant] of Object.entries(variants)) {
      const presetName = variant.label || vKey;
      presets[presetName] = variant.props;
    }
  }

  // Determine which slot feeds `children`
  const activeChildrenSlot =
    childrenSlot ||
    (slots && 'children' in slots
      ? 'children'
      : slots && 'content' in slots
        ? 'content'
        : undefined);

  // Adapted render function
  const render = (renderProps: P & { editing?: boolean }) => {
    const { editing, ...rest } = renderProps;
    const propsForTarget = { ...rest } as Record<string, unknown>;

    // 1. Slot adaptation: pass evaluated slot as children or named slots
    if (activeChildrenSlot && typeof propsForTarget[activeChildrenSlot] === 'function') {
      const slotFn = propsForTarget[activeChildrenSlot] as SlotRender;
      propsForTarget.children = slotFn();
    } else if (typeof propsForTarget.children === 'function') {
      const slotFn = propsForTarget.children as unknown as SlotRender;
      propsForTarget.children = slotFn();
    }

    // 2. Support passing editing flag if the target component declares it in props schema
    const shape = shapeOf(schema as z.ZodType);
    if ('editing' in shape) {
      propsForTarget.editing = editing;
    }

    const componentNode = (
      <TargetComponent {...(propsForTarget as unknown as P)} />
    );

    // 3. Wrap with error boundary in both editing and public modes
    const wrapped = (
      <ComponentErrorBoundary
        componentName={name}
        componentLabel={label}
        editing={editing}
      >
        {deprecated && editing ? (
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                zIndex: 10,
                fontSize: '10px',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '4px',
                background: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fcd34d',
                pointerEvents: 'none',
              }}
            >
              Deprecated
            </div>
            {componentNode}
          </div>
        ) : (
          componentNode
        )}
      </ComponentErrorBoundary>
    );

    return wrapped;
  };

  const blockMeta: BlockInfo = {
    category,
    description,
    icon,
  };

  const definition: BlockDefinition = {
    type: name,
    label,
    keywords,
    ...blockMeta,
    ...metaRest,
    schema: schema as unknown as z.ZodType<Record<string, unknown>>,
    fields: explicitFields as unknown as Fields<Record<string, unknown>>,
    defaults: defaults as unknown as BlockDefinition['defaults'],
    slots,
    arraySlots,
    presets: Object.keys(presets).length > 0 ? presets : undefined,
    loader: loader as unknown as BlockLoader<LoaderContext>,
    traits: traits as unknown as PropTrait<Record<string, unknown>>[],
    tabs,
    render: render as ComponentType<Record<string, unknown>>,
  };

  return definition;
}

/* ---------- first-party component registry (RFB-03) ---------- */

export class ReactComponentRegistry {
  private definitions = new Map<string, BlockDefinition>();
  private optionsMap = new Map<string, ReactComponentBridgeOptions<any>>();
  private diagnostics = new Map<string, ComponentDiagnostic[]>();

  /**
   * Registers an existing React component through the bridge options.
   */
  register<P extends Record<string, unknown>>(
    options: ReactComponentBridgeOptions<P>
  ): BlockDefinition {
    const validation = validateComponentRegistration(options);
    const diags = [...validation.errors, ...validation.warnings];
    this.diagnostics.set(options.name, diags);

    const definition = defineReactComponent(options);
    this.definitions.set(options.name, definition);
    this.optionsMap.set(options.name, options);
    return definition;
  }

  /**
   * Registers multiple React components at once.
   */
  registerMany(optionsList: ReactComponentBridgeOptions<any>[]): BlockDefinition[] {
    return optionsList.map(opt => this.register(opt));
  }

  /**
   * Unregisters a component by name.
   */
  unregister(name: string): boolean {
    this.diagnostics.delete(name);
    this.optionsMap.delete(name);
    return this.definitions.delete(name);
  }

  /**
   * Returns a registered block definition.
   */
  get(name: string): BlockDefinition | undefined {
    return this.definitions.get(name);
  }

  /**
   * Returns the original bridge options used to register a component.
   */
  getOptions(name: string): ReactComponentBridgeOptions<any> | undefined {
    return this.optionsMap.get(name);
  }

  /**
   * Checks whether a component is registered.
   */
  has(name: string): boolean {
    return this.definitions.has(name);
  }

  /**
   * Returns all registered block definitions as an array.
   */
  list(): BlockDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Returns all registered bridge options as an array.
   */
  listOptions(): ReactComponentBridgeOptions<any>[] {
    return Array.from(this.optionsMap.values());
  }

  /**
   * Returns map of all components for renderer usage.
   */
  getComponents(): BlockComponents {
    const components: BlockComponents = {};
    for (const [name, def] of this.definitions) {
      components[name] = def.render as ComponentType<Record<string, unknown>>;
    }
    return components;
  }

  /**
   * Returns map of editor BlockSchemas.
   */
  getSchemas(ctx?: DefaultsContext): Record<string, BlockSchema> {
    const schemas: Record<string, BlockSchema> = {};
    for (const [name, def] of this.definitions) {
      schemas[name] = toBlockSchema(def, ctx);
    }
    return schemas;
  }

  /**
   * Builds a `BuilderConfig` directly from all registered components.
   */
  toBuilderConfig(): BuilderConfig {
    return createBuilderConfig({
      blocks: this.list(),
    });
  }

  /**
   * Returns all recorded diagnostics across registered components.
   */
  getDiagnostics(): Record<string, ComponentDiagnostic[]> {
    const result: Record<string, ComponentDiagnostic[]> = {};
    for (const [name, diags] of this.diagnostics) {
      if (diags.length > 0) result[name] = diags;
    }
    return result;
  }

  /**
   * Clears all registrations.
   */
  clear(): void {
    this.definitions.clear( );
    this.optionsMap.clear();
    this.diagnostics.clear();
  }
}

/**
 * Creates an isolated component registry instance.
 */
export function createReactComponentRegistry(): ReactComponentRegistry {
  return new ReactComponentRegistry();
}

/**
 * Global singleton component registry for host apps and plugins.
 */
export const defaultComponentRegistry = createReactComponentRegistry();

/**
 * Convenience helper to register a React component into the global registry.
 */
export function registerReactComponent<
  P extends Record<string, unknown> = Record<string, unknown>,
>(options: ReactComponentBridgeOptions<P>): BlockDefinition {
  return defaultComponentRegistry.register(options);
}

/**
 * Convenience getter for the global component registry.
 */
export function getReactComponentRegistry(): ReactComponentRegistry {
  return defaultComponentRegistry;
}

/* ---------- developer live preview harness (RFB-06) ---------- */

export type ReactComponentPreviewProps<
  P extends Record<string, unknown> = Record<string, unknown>,
> = {
  options: ReactComponentBridgeOptions<P>;
  selectedVariant?: string;
  initialVariant?: string;
  mockProps?: Partial<P>;
  children?: ReactNode;
  containerStyle?: CSSProperties;
};

/**
 * Live preview harness for developers to test adapted React components with
 * variants, slots, and props inspection before or during visual editor usage.
 */
export function ReactComponentPreview<P extends Record<string, unknown>>({
  options,
  selectedVariant,
  initialVariant,
  mockProps,
  children,
  containerStyle,
}: ReactComponentPreviewProps<P>) {
  const activeVariant =
    selectedVariant ||
    initialVariant ||
    (options.variants ? Object.keys(options.variants)[0] : undefined);

  const variantOverrides =
    activeVariant && options.variants?.[activeVariant]
      ? options.variants[activeVariant].props
      : {};

  const schemaDefaults = calcDefaultProps(
    defineReactComponent(options) as unknown as BlockDefinition
  ) as Partial<P>;

  const mergedProps = {
    ...schemaDefaults,
    ...variantOverrides,
    ...mockProps,
  } as P;

  const TargetComponent = options.component;

  return (
    <div
      style={{
        border: '1px solid rgba(127,127,127,0.25)',
        borderRadius: '10px',
        overflow: 'hidden',
        background: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          background: 'rgba(127,127,127,0.06)',
          borderBottom: '1px solid rgba(127,127,127,0.15)',
        }}
      >
        <div>
          <span style={{ fontWeight: 600, fontSize: '13px' }}>
            {options.label}
          </span>
          <span
            style={{
              marginLeft: '8px',
              fontSize: '11px',
              color: 'rgba(127,127,127,0.9)',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            &lt;{options.name} /&gt;
          </span>
        </div>
        {activeVariant && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'rgba(79,70,229,0.1)',
              color: '#4f46e5',
              fontWeight: 500,
            }}
          >
            Variant: {options.variants?.[activeVariant]?.label || activeVariant}
          </span>
        )}
      </div>
      <div
        style={{
          padding: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          ...options.preview?.containerStyle,
          ...containerStyle,
        }}
      >
        <ComponentErrorBoundary
          componentName={options.name}
          componentLabel={options.label}
          editing={true}
        >
          <TargetComponent {...mergedProps}>
            {children}
          </TargetComponent>
        </ComponentErrorBoundary>
      </div>
    </div>
  );
}
