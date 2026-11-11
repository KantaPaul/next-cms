'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useBreakpoints } from '../breakpoints';
import { useEditorBridge } from '../controls/editor-bridge';
import {
  deviceForWidth,
  resolveLinkProps,
  type ContainerSettings,
  type Device,
} from '../style';
import type { ContainerProps } from './container';
import { hasNestedInteractive, renderContainerBody } from './container';

/** Device detection that does not depend on Puck store context, so Container
 * renders safely both inside the Puck canvas (where `useCanvasDevice` is
 * available) and inside `Puck.Preview`'s iframe (where store context may not
 * flow through the portal boundary). */
function useContainerDevice(): Device {
  const breakpoints = useBreakpoints();
  const [device, setDevice] = useState<Device>('desktop');
  useEffect(() => {
    const update = () =>
      setDevice(deviceForWidth(window.innerWidth, breakpoints));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [breakpoints]);
  return device;
}

export function ContainerEditor({
  p,
  c,
}: {
  p: ContainerProps;
  c: ContainerSettings;
}): ReactNode {
  const bridge = useEditorBridge();
  const windowDevice = useContainerDevice();
  const device =
    bridge?.device && bridge.device !== 'desktop'
      ? bridge.device
      : windowDevice;
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
