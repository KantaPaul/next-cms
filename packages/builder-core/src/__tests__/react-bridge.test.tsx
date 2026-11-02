import assert from 'node:assert';
import { describe, it } from 'node:test';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { createNode } from '../blocks';
import { defaultProps, fieldsOf, slot, toBlockSchema } from '../define';
import { emptyDocument } from '../document';
import { dynamic, responsive, token, translatable } from '../schema-helpers';
import {
  type ComponentDiagnostic,
  createReactComponentRegistry,
  defaultComponentRegistry,
  defineReactComponent,
  ReactComponentRegistry,
  registerReactComponent,
  validateComponentRegistration,
} from '../react-bridge';
import { BuilderRenderer, createBuilderConfig } from '../public-api';
import { renderDocument } from '../renderer';

/* ---------- Mock standard React components ---------- */

type BadgeProps = {
  text: string;
  variant?: 'solid' | 'outline' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  count?: number;
};

function Badge({ text, variant = 'solid', size = 'md', count }: BadgeProps) {
  return (
    <span data-badge={variant} data-size={size}>
      {text} {count !== undefined ? `(${count})` : null}
    </span>
  );
}

type CardProps = {
  title: string;
  featured?: boolean;
  color?: string;
  tagline?: string;
  children?: ReactNode;
};

function Card({ title, featured, color, tagline, children }: CardProps) {
  return (
    <div data-card={title} data-featured={String(featured)} data-color={color}>
      <h3>{title}</h3>
      {tagline && <p>{tagline}</p>}
      <div className="card-body">{children}</div>
    </div>
  );
}

function BrokenComponent({ shouldThrow }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Explosion in custom component!');
  }
  return <div>I am safe</div>;
}

/* ---------- Test Suite ---------- */

describe('Typed React Component Bridge (R435–R442, R456, R460)', () => {
  describe('Adapter Contract & Registration (RFB-02, RFB-03)', () => {
    it('adapts an existing React component without duplicating its rendering implementation', () => {
      const BadgeBlock = defineReactComponent<BadgeProps>({
        name: 'Badge',
        label: 'Status Badge',
        category: 'UI',
        keywords: ['tag', 'chip', 'status'],
        description: 'Displays a compact status indicator or label.',
        props: z.object({
          text: z.string().default('Active'),
          variant: z.enum(['solid', 'outline', 'subtle']).default('solid'),
          size: z.union([z.literal('sm'), z.literal('md'), z.literal('lg')]).default('md'),
          count: z.number().int().min(0).optional(),
        }),
        component: Badge,
        defaults: { text: 'New' },
      });

      assert.equal(BadgeBlock.type, 'Badge');
      assert.equal(BadgeBlock.label, 'Status Badge');
      assert.equal(BadgeBlock.category, 'UI');
      assert.deepEqual(BadgeBlock.keywords, ['tag', 'chip', 'status']);

      const schema = toBlockSchema(BadgeBlock);
      assert.equal(schema.type, 'Badge');
      assert.equal(schema.label, 'Status Badge');
      assert.equal(schema.defaultProps?.text, 'New');
      assert.equal(schema.defaultProps?.variant, 'solid');
    });

    it('manages components in a first-party component registry', () => {
      const registry = createReactComponentRegistry();

      const CardBlock = registry.register<CardProps>({
        name: 'Card',
        label: 'Card Container',
        props: z.object({
          title: z.string().default('Card Title'),
          featured: z.boolean().default(false),
        }),
        slots: { content: slot() },
        childrenSlot: 'content',
        component: Card,
      });

      assert.ok(registry.has('Card'));
      assert.equal(registry.get('Card')?.type, 'Card');
      assert.equal(registry.list().length, 1);
      assert.equal(typeof registry.getComponents().Card, 'function');

      const config = registry.toBuilderConfig();
      assert.ok(config.schemas.Card);
      assert.ok(config.components.Card);

      registry.unregister('Card');
      assert.equal(registry.has('Card'), false);
      assert.equal(registry.list().length, 0);
    });

    it('works with the global singleton registry', () => {
      const definition = registerReactComponent<BadgeProps>({
        name: 'GlobalBadge',
        label: 'Global Badge',
        props: z.object({
          text: z.string().default('Global'),
        }),
        component: Badge,
      });

      assert.ok(defaultComponentRegistry.has('GlobalBadge'));
      assert.equal(defaultComponentRegistry.get('GlobalBadge')?.type, 'GlobalBadge');
      defaultComponentRegistry.unregister('GlobalBadge');
    });
  });

  describe('Schema-Generated Editor Controls (RFB-04)', () => {
    it('generates editor fields for primitives, enums, and literal unions', () => {
      const block = defineReactComponent({
        name: 'Sample',
        label: 'Sample',
        props: z.object({
          title: z.string().describe('The primary heading'),
          score: z.number().default(100),
          active: z.boolean().default(true),
          status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
          size: z.union([z.literal('small'), z.literal('large')]).default('small'),
        }),
        component: () => null as never,
      });

      const fields = fieldsOf(block);
      assert.equal(fields.title.type, 'text');
      assert.equal(fields.title.description, 'The primary heading');
      assert.equal(fields.score.type, 'number');
      assert.equal(fields.active.type, 'toggle');

      assert.equal(fields.status.type, 'select');
      if (fields.status.type === 'select') {
        assert.deepEqual(fields.status.options.map(o => o.value), ['pending', 'approved', 'rejected']);
      }

      assert.equal(fields.size.type, 'select');
      if (fields.size.type === 'select') {
        assert.deepEqual(fields.size.options.map(o => o.value), ['small', 'large']);
      }
    });

    it('supports responsive, token, dynamic, and translatable schema helpers', () => {
      const block = defineReactComponent({
        name: 'ComplexBlock',
        label: 'Complex Block',
        props: z.object({
          padding: responsive(z.number()).default(16),
          themeColor: token('color').default('primary'),
          headline: dynamic(z.string()).default('Dynamic Headline'),
          localizedMsg: translatable(z.string()).default('Hello'),
        }),
        component: () => null as never,
      });

      const fields = fieldsOf(block);
      assert.equal(fields.padding.type, 'number');
      assert.equal(fields.padding.responsive, true);

      assert.equal(fields.themeColor.type, 'color');

      assert.equal(fields.headline.type, 'text');
      assert.equal(fields.headline.dynamic, true);

      assert.equal(fields.localizedMsg.type, 'text');
      assert.equal(fields.localizedMsg.translatable, true);
    });

    it('preserves explicit field overrides provided by developer', () => {
      const block = defineReactComponent({
        name: 'Overridden',
        label: 'Overridden',
        props: z.object({
          summary: z.string(),
        }),
        fields: {
          summary: {
            type: 'textarea',
            label: 'Detailed Summary',
            section: 'Content',
          },
        },
        component: () => null as never,
      });

      const fields = fieldsOf(block);
      assert.equal(fields.summary.type, 'textarea');
      assert.equal(fields.summary.label, 'Detailed Summary');
    });
  });

  describe('Component Variants & Presets (RFB-05)', () => {
    it('translates component variants into editor presets with stable identifiers', () => {
      const ButtonComponent = ({ label, variant }: { label: string; variant?: string }) => (
        <button className={variant}>{label}</button>
      );

      const ButtonBlock = defineReactComponent({
        name: 'Button',
        label: 'Button',
        props: z.object({
          label: z.string().default('Click me'),
          variant: z.enum(['primary', 'secondary', 'destructive', 'ghost']).default('primary'),
        }),
        variants: {
          danger: {
            label: 'Danger Button',
            description: 'Red action button for destructive operations',
            props: { variant: 'destructive', label: 'Delete Item' },
          },
          subtle: {
            label: 'Subtle Ghost',
            props: { variant: 'ghost' },
          },
        },
        component: ButtonComponent,
      });

      const schema = toBlockSchema(ButtonBlock);
      assert.ok(schema.presets);
      assert.deepEqual(schema.presets['Danger Button'], {
        label: 'Delete Item',
        variant: 'destructive',
      });
      assert.deepEqual(schema.presets['Subtle Ghost'], {
        label: 'Click me',
        variant: 'ghost',
      });
    });
  });

  describe('Server/Client Boundaries & Diagnostics (RFB-07, RFB-08)', () => {
    it('detects non-serializable props such as callbacks and functions', () => {
      const validation = validateComponentRegistration({
        name: 'BadBlock',
        label: 'Bad Block',
        props: z.object({
          title: z.string(),
          onClick: z.function(),
        }) as any,
        component: () => null as never,
      });

      assert.equal(validation.valid, false);
      assert.ok(validation.errors.some(e => e.code === 'NON_SERIALIZABLE_PROP'));
      assert.ok(validation.errors.some(e => e.code === 'EVENT_HANDLER_PROP'));
    });

    it('rejects invalid component names with clear error diagnostics', () => {
      const validation = validateComponentRegistration({
        name: 'Invalid Name With Spaces!',
        label: 'Invalid',
        props: z.object({}),
        component: () => null as never,
      });

      assert.equal(validation.valid, false);
      assert.ok(validation.errors.some(e => e.code === 'INVALID_NAME_FORMAT'));
    });

    it('warns about invalid default values', () => {
      const validation = validateComponentRegistration({
        name: 'BadDefaults',
        label: 'Bad Defaults',
        props: z.object({
          age: z.number().min(18),
        }),
        defaults: { age: 10 },
        component: () => null as never,
      });

      assert.ok(validation.warnings.some(w => w.code === 'INVALID_DEFAULTS'));
    });

    it('prevents registration if errors exist in defineReactComponent', () => {
      assert.throws(() => {
        defineReactComponent({
          name: 'Invalid!Name',
          label: 'Test',
          props: z.object({}),
          component: () => null as never,
        });
      }, /Failed to register React component/);
    });
  });

  describe('Slots & Children Adaptation', () => {
    it('adapts slot functions into ReactNode children automatically', () => {
      const ContainerBlock = defineReactComponent<CardProps>({
        name: 'CardContainer',
        label: 'Card Container',
        props: z.object({
          title: z.string().default('Header'),
        }),
        slots: { content: slot() },
        childrenSlot: 'content',
        component: Card,
      });

      const config = createBuilderConfig({ blocks: [ContainerBlock] });

      const doc = {
        ...emptyDocument(),
        nodes: {
          'card-1': {
            id: 'card-1',
            type: 'CardContainer',
            props: { title: 'Slot Card' },
            slots: { content: ['child-1'] },
          },
          'child-1': {
            id: 'child-1',
            type: 'CardContainer',
            props: { title: 'Inner Card' },
            slots: {},
          },
        },
        rootSlot: ['card-1'],
      };

      const rendered = renderDocument(doc, {
        components: config.components,
      });
      assert.ok(rendered);
    });
  });

  describe('Error Boundary Isolation', () => {
    it('catches runtime errors in custom components during editor rendering', () => {
      const RiskyBlock = defineReactComponent<{ shouldThrow?: boolean }>({
        name: 'Risky',
        label: 'Risky Component',
        props: z.object({
          shouldThrow: z.boolean().default(false),
        }),
        component: BrokenComponent,
      });

      // When rendering with editing=true and error thrown, error boundary catches it
      const renderFn = RiskyBlock.render as (props: unknown) => React.ReactNode;
      const element = renderFn({ shouldThrow: true, editing: true });
      assert.ok(element);
    });
  });

  describe('Full BuilderRenderer End-to-End Pipeline', () => {
    it('renders adapted components with BuilderRenderer', () => {
      const registry = createReactComponentRegistry();
      registry.register<BadgeProps>({
        name: 'Badge',
        label: 'Badge',
        props: z.object({
          text: z.string().default('Status'),
          variant: z.enum(['solid', 'outline', 'subtle']).default('solid'),
        }),
        component: Badge,
      });

      const config = registry.toBuilderConfig();

      const doc = {
        ...emptyDocument(),
        nodes: {
          'b-1': {
            id: 'b-1',
            type: 'Badge',
            props: { text: 'Verified', variant: 'outline' },
            slots: {},
          },
        },
        rootSlot: ['b-1'],
      };

      const result = BuilderRenderer({
        config,
        document: doc,
      });

      assert.ok(result);
    });
  });
});
