import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import type { BuilderItem } from '../data';
import {
  deviceForWidth,
  pick,
  type ContainerSettings,
  type ContainerTag,
  CONTAINER_TAGS,
  DEFAULT_CONTAINER,
  normalizeContainerSettings,
  resolveContainerStyle,
  resolveFlexItemStyle,
  resolveGridItemStyle,
  resolveLinkProps,
  type Device,
} from '../style';

export { DEFAULT_CONTAINER };
import type { SlotValue } from './content';
import { rehydrateItem } from './block-list';
import { BlockList } from './block-list';
import { MotionItem } from '../motion';
import { Section, type SectionSettings } from './section';
import { ContainerEditor } from './container-editor-client';

type WithSection = { section?: SectionSettings; editing?: boolean };
type PropsItem = { props: Record<string, unknown> & { id: string } };

export type ContainerProps = WithSection & {
  container?: ContainerSettings;
  content?: SlotValue;
  zones?: Record<string, BuilderItem[]>;
  id?: string;
};

/** Editor-only hint: a whole-container link must not wrap nested links/buttons. */
export function hasNestedInteractive(
  content: SlotValue | undefined,
  zones?: Record<string, BuilderItem[]>
): boolean {
  const items = Array.isArray(content) ? content : content ? [content] : [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const type = (item as { type?: unknown }).type;
    if (type === 'Button') return true;

    if (type === 'Container') {
      const props = (item as unknown as PropsItem).props;
      const c = (props as { container?: ContainerSettings }).container;
      if (c?.link) return true;
    }

    const key = (item as unknown as PropsItem).props.id;

    if (typeof key === 'string' && zones) {
      const prefix = `${key}:`;

      for (const zoneKey of Object.keys(zones)) {
        if (
          zoneKey.startsWith(prefix) &&
          hasNestedInteractive(zones[zoneKey], zones)
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

/** Classes that lay out the container's children (the rest size the box). */
const LAYOUT_CLASSES = new Set([
  's-c-d',
  's-c-fd',
  's-c-fw',
  's-c-jc',
  's-c-ai',
  's-c-ac',
  's-c-ga',
  's-c-cga',
  's-c-rga',
  's-c-gtc',
  's-c-gtr',
  's-c-gaf',
]);

/** CSS variable prefixes behind LAYOUT_CLASSES, e.g. `--s-c-fd-` for `s-c-fd`. */
const LAYOUT_VAR_PREFIXES = [...LAYOUT_CLASSES].map(cls => `--${cls}-`);

/**
 * Picks the layout CSS variables (every breakpoint suffix) out of a resolved
 * container style. The `--s-c-*` variables are registered with
 * `inherits:false`, so the slot wrapper must carry its own copy.
 */
export function pickLayoutVars(
  style: CSSProperties | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(style ?? {})) {
    if (value === undefined || value === null) continue;
    if (LAYOUT_VAR_PREFIXES.some(prefix => key.startsWith(prefix))) {
      out[key] = String(value);
    }
  }
  return out;
}

/** The slot wrapper fills the container and takes over its layout. */
const SLOT_FILL: CSSProperties = {
  flex: '1 1 auto',
  alignSelf: 'stretch',
  gridColumn: '1 / -1',
  gridRow: '1 / -1',
  width: '100%',
  minWidth: 0,
};

function renderContainerChildren(
  content: SlotValue | undefined,
  zones: Record<string, BuilderItem[]> | undefined,
  device: Device,
  resolved: { classes: string[]; style?: CSSProperties }
): ReactNode {
  if (typeof content === 'function') {
    // Children render inside one slot wrapper, so it gets the container's
    // flex/grid classes plus their CSS variables. The variables don't
    // inherit (see buildResponsiveCss), so they must be set here too.
    return content({
      className: resolved.classes
        .filter(cls => LAYOUT_CLASSES.has(cls))
        .join(' '),
      style: { ...pickLayoutVars(resolved.style), ...SLOT_FILL },
      minEmptyHeight: 80,
    });
  }

  const items = Array.isArray(content) ? content : content ? [content] : [];
  if (!items.length) return null;
  return items.map(item => {
    if (!item || typeof item !== 'object') return null;
    const child = rehydrateItem(item as BuilderItem, zones);
    const section = (child.props as { section?: SectionSettings }).section;
    const style = {
      ...resolveFlexItemStyle(section?.flexItem, device),
      ...resolveGridItemStyle(section?.gridItem, device),
    };
    return (
      <MotionItem key={child.props.id} className="min-w-0" style={style}>
        <BlockList items={[child]} zones={zones} nested />
      </MotionItem>
    );
  });
}

/** Flex-item classes that belong on the outer `<section>` sitting in the parent's flex row. */
const ITEM_CLASSES = new Set(['s-c-grw', 's-c-grs', 's-c-grb']);

/** CSS variable prefixes behind ITEM_CLASSES. */
const ITEM_VAR_PREFIXES = [...ITEM_CLASSES].map(cls => `--${cls}-`);

function splitItemStyles(resolved: {
  classes: string[];
  style: CSSProperties;
}): {
  bodyClasses: string[];
  bodyStyle: CSSProperties;
  itemClassName?: string;
  itemStyle?: CSSProperties;
} {
  const bodyClasses: string[] = [];
  const itemClasses: string[] = [];
  for (const cls of resolved.classes) {
    if (ITEM_CLASSES.has(cls)) itemClasses.push(cls);
    else bodyClasses.push(cls);
  }

  const bodyStyle: Record<string, unknown> = {};
  const itemStyle: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(resolved.style ?? {})) {
    if (ITEM_VAR_PREFIXES.some(prefix => key.startsWith(prefix))) {
      itemStyle[key] = val;
    } else {
      bodyStyle[key] = val;
    }
  }

  return {
    bodyClasses,
    bodyStyle: bodyStyle as CSSProperties,
    itemClassName: itemClasses.length ? itemClasses.join(' ') : undefined,
    itemStyle: Object.keys(itemStyle).length
      ? (itemStyle as CSSProperties)
      : undefined,
  };
}

export function renderContainerBody({
  p,
  c,
  device,
  editorNotes,
}: {
  p: ContainerProps;
  c: ContainerSettings;
  device: Device;
  editorNotes: ReactNode[];
}): ReactNode {
  const resolved = resolveContainerStyle(c, device);
  const { bodyClasses, bodyStyle, itemClassName, itemStyle } =
    splitItemStyles(resolved);
  const tag = pick(c.tag, CONTAINER_TAGS);
  const Tag: ContainerTag | 'div' = tag ?? 'div';
  const linkProps = c.link ? resolveLinkProps(c.link) : null;
  const children = renderContainerChildren(
    p.content,
    p.zones,
    device,
    resolved
  );
  const empty = p.editing && !children;

  const body = (
    <Tag className={cn('s-cntr', bodyClasses)} style={bodyStyle}>
      {empty ? (
        <div className="flex h-32 w-full items-center justify-center rounded-md border border-dashed border-steel-200 bg-steel-50 text-[11px] text-steel-400">
          Drop blocks here
        </div>
      ) : (
        children
      )}
    </Tag>
  );

  return (
    <Section
      section={p.section}
      editing={p.editing}
      itemClassName={itemClassName}
      itemStyle={itemStyle}
    >
      {editorNotes}
      {linkProps ? <a {...linkProps}>{body}</a> : body}
    </Section>
  );
}

function ContainerPublic({
  p,
  c,
}: {
  p: ContainerProps;
  c: ContainerSettings;
}): ReactNode {
  // Public pages render outside Puck: resolve with the desktop base and skip
  // all Puck-context hooks (they throw without a <Puck> provider).
  return renderContainerBody({ p, c, device: 'desktop', editorNotes: [] });
}

export function Container(p: ContainerProps): ReactNode {
  const { editing } = p;
  const c = normalizeContainerSettings(p.container);
  return editing ? (
    <ContainerEditor p={p} c={c} />
  ) : (
    <ContainerPublic p={p} c={c} />
  );
}
