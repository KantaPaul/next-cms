'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
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

/** The editor's slot wrapper fills the container and takes over its layout. */
const SLOT_FILL: CSSProperties = {
  flex: '1 1 auto',
  alignSelf: 'stretch',
  gridColumn: '1 / -1',
  width: '100%',
  minWidth: 0,
};

function renderContainerChildren(
  content: SlotValue | undefined,
  zones: Record<string, BuilderItem[]> | undefined,
  device: Device,
  classes: string[]
): ReactNode {
  if (typeof content === 'function') {
    // The editor wraps children in one slot element, so give it the
    // container's flex/grid classes; their CSS variables inherit from the tag.
    return content({
      className: classes.filter(cls => LAYOUT_CLASSES.has(cls)).join(' '),
      style: SLOT_FILL,
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

/** Device detection that does not depend on Puck store context, so Container
 * renders safely both inside the Puck canvas (where `useCanvasDevice` is
 * available) and inside `Puck.Preview`'s iframe (where store context may not
 * flow through the portal boundary). */
function useContainerDevice(): Device {
  const [device, setDevice] = useState<Device>('desktop');
  useEffect(() => {
    const update = () => setDevice(deviceForWidth(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return device;
}

function renderContainerBody({
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
  const tag = pick(c.tag, CONTAINER_TAGS);
  const Tag: ContainerTag | 'div' = tag ?? 'div';
  const linkProps = c.link ? resolveLinkProps(c.link) : null;
  const children = renderContainerChildren(
    p.content,
    p.zones,
    device,
    resolved.classes
  );
  const empty = p.editing && !children;

  const body = (
    <Tag className={cn('s-cntr', resolved.classes)} style={resolved.style}>
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
    <Section section={p.section} editing={p.editing}>
      {editorNotes}
      {linkProps ? <a {...linkProps}>{body}</a> : body}
    </Section>
  );
}

function ContainerEditor({
  p,
  c,
}: {
  p: ContainerProps;
  c: ContainerSettings;
}): ReactNode {
  const device = useContainerDevice();
  const linkProps = c.link ? resolveLinkProps(c.link) : null;
  const nestedWarning = !!linkProps && hasNestedInteractive(p.content, p.zones);

  const editorNotes: ReactNode[] = [];

  if (nestedWarning) {
    editorNotes.push(
      <div
        key="nested-link"
        className="rounded-md border border-red-200 bg-red-50 p-2 text-[11px] text-red-700"
      >
        Whole-container link: do not nest links or buttons inside.
      </div>
    );
  }

  return renderContainerBody({ p, c, device, editorNotes });
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
