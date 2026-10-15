import type { ComponentType } from 'react';
import type { BuilderItem } from '../data';
import * as registry from './registry';

/**
 * Renders stored block data outside Puck (global block contents and slots inside them).
 * The registry is read at call time because it imports blocks that import this module.
 */
export function BlockList({ items, nested }: { items: BuilderItem[]; nested?: boolean }) {
  const components = registry.getBlockComponents() as unknown as Record<string, ComponentType<Record<string, unknown>>>;

  return (
    <>
      {items.map(item => {
        const Component = components[item.type];
        if (!Component) return null;
        return <Component key={item.props.id} {...item.props} {...(nested && { section: { ...(item.props.section as object), paddingY: 'none' } })} />;
      })}
    </>
  );
}
