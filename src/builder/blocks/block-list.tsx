import type { ComponentType } from 'react';
import type { BuilderItem } from '../data';
import * as registry from './registry';

function setPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.replace(/\[(\w+)\]/g, '.$1').split('.');
  let current: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined || current[part] === null) {
      const nextPart = parts[i + 1];
      current[part] = /^\d+$/.test(nextPart) ? [] : {};
    }
    current = current[part];
  }
  if (current && typeof current === 'object') {
    current[parts[parts.length - 1]] = value;
  }
}

function rehydrateItem(item: BuilderItem, zones?: Record<string, BuilderItem[]>): BuilderItem {
  if (!zones || !item.props?.id) return item;
  const nextProps = structuredClone(item.props);
  const prefix = `${item.props.id}:`;

  for (const [key, rawZoneItems] of Object.entries(zones)) {
    if (key.startsWith(prefix)) {
      const slotPath = key.slice(prefix.length);
      const rehydratedZoneItems = (rawZoneItems ?? []).map(child => rehydrateItem(child, zones));
      setPath(nextProps, slotPath, rehydratedZoneItems);
    }
  }

  return {
    ...item,
    props: nextProps,
  };
}

/**
 * Renders stored block data outside Puck (global block contents and slots inside them).
 * The registry is read at call time because it imports blocks that import this module.
 */
export function BlockList({
  items,
  zones,
  nested,
}: {
  items: BuilderItem[];
  zones?: Record<string, BuilderItem[]>;
  nested?: boolean;
}) {
  const components = registry.getBlockComponents() as unknown as Record<
    string,
    ComponentType<Record<string, unknown>>
  >;

  const rehydratedItems = zones ? items.map(item => rehydrateItem(item, zones)) : items;

  return (
    <>
      {rehydratedItems.map(item => {
        const Component = components[item.type];
        if (!Component) return null;
        return (
          <Component
            key={item.props.id}
            {...item.props}
            {...(nested && {
              section: { ...(item.props.section as object), paddingY: 'none' },
            })}
          />
        );
      })}
    </>
  );
}
