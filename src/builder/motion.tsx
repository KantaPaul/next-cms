'use client';

import { motion } from 'motion/react';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils/cn';
import {
  ATTENTION_SEEKERS,
  deviceForWidth,
  ENTRANCE_CLASS,
  EXIT_CLASS,
  HOVER_CLASS,
  pick,
  PAGE_TRANSITIONS,
  type Device,
  type ResolvedAnimation,
} from './style';

const STAGGER_STEP = 0.08;

/* ---------- scope: editor preview, page transition ---------- */

type Scope = { editing: boolean; preview: boolean };
const ScopeContext = createContext<Scope>({ editing: false, preview: false });

function useReducedMotionAfterMount() {
  const [reduced, setReduced] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return { reduced, mounted };
}

export function MotionScope({
  editing,
  preview,
  transition,
  children,
}: {
  editing: boolean;
  preview?: boolean;
  transition?: string;
  children: ReactNode;
}) {
  const { reduced, mounted } = useReducedMotionAfterMount();
  const t = pick(transition, PAGE_TRANSITIONS) ?? 'none';
  const play = mounted && !reduced && !editing && t !== 'none';

  return (
    <ScopeContext.Provider value={{ editing, preview: !!preview }}>
      <motion.div
        className="contents"
        initial={play ? (t === 'fade' ? { opacity: 0 } : { opacity: 0, y: 16 }) : false}
        animate={play ? { opacity: 1, y: 0 } : undefined}
        transition={play ? { duration: 0.4, ease: 'easeOut' } : undefined}
      >
        {children}
      </motion.div>
    </ScopeContext.Provider>
  );
}

/* ---------- section motion ---------- */

type MotionSectionProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'div' | 'header' | 'footer' | 'article' | 'aside' | 'nav';
  animation?: ResolvedAnimation | null;
  children?: ReactNode;
};

function useDevice(): Device {
  const [device, setDevice] = useState<Device>('desktop');
  useEffect(() => {
    const update = () => setDevice(deviceForWidth(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return device;
}

function allowedOnDevice(a: ResolvedAnimation | null | undefined, device: Device) {
  if (!a?.devices) return true;
  const d = a.devices;
  if (d[device] === false) return false;
  if (d[device] === true) return true;
  // if any explicit true exists and this device is not true, skip
  const hasTrue = Object.values(d).some(v => v === true);
  return !hasTrue;
}

export function MotionSection(props: MotionSectionProps) {
  const { as: Tag = 'section', animation, className, style, children, ...rest } = props;
  const scope = useContext(ScopeContext);
  const device = useDevice();
  const { reduced, mounted } = useReducedMotionAfterMount();
  const a = animation;

  if (!a || reduced || !mounted || !allowedOnDevice(a, device)) {
    return (
      <Tag className={className} style={style} {...rest}>
        {children}
      </Tag>
    );
  }

  const entranceName = a.entranceClass ? ENTRANCE_CLASS[a.entranceClass as keyof typeof ENTRANCE_CLASS] : undefined;
  const exitName = a.exitClass ? EXIT_CLASS[a.exitClass as keyof typeof EXIT_CLASS] : undefined;
  const hoverName = a.hoverClass ? HOVER_CLASS[a.hoverClass as keyof typeof HOVER_CLASS] : undefined;
  const attention = a.entranceClass ? ATTENTION_SEEKERS.has(a.entranceClass) : false;

  const durationMs = a.duration ?? 600;
  const delayMs = a.delay ?? 0;
  const cssVars = {
    ...(style as CSSProperties),
    ['--animate-duration' as string]: `${durationMs}ms`,
    ['--animate-delay' as string]: `${delayMs}ms`,
  } as CSSProperties;

  // Editor: static unless motion preview is on
  if (scope.editing && !scope.preview) {
    return (
      <Tag className={className} style={style} {...rest}>
        {children}
      </Tag>
    );
  }

  const classes = cn(
    className,
    entranceName && 'animate__animated',
    entranceName,
    hoverName,
    attention && 'animate__repeat-1'
  );

  return (
    <Tag
      className={classes}
      style={cssVars}
      data-motion={entranceName || exitName || hoverName ? '' : undefined}
      data-exit={exitName || undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ---------- stagger boundary + item ---------- */

const StaggerContext = createContext<{ index: number; take: () => number } | null>(null);

export function MotionBoundary({ children }: { children: ReactNode }) {
  const indexRef = useRef(0);
  const api = {
    index: 0,
    take: () => {
      const i = indexRef.current;
      indexRef.current += 1;
      return i;
    },
  };
  return <StaggerContext.Provider value={api}>{children}</StaggerContext.Provider>;
}

export function MotionItem({
  className,
  style,
  children,
  animation,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { animation?: ResolvedAnimation | null }) {
  const stagger = useContext(StaggerContext);
  const scope = useContext(ScopeContext);
  const { reduced, mounted } = useReducedMotionAfterMount();
  const idx = useRef<number | null>(null);
  if (idx.current === null && stagger) idx.current = stagger.take();

  const a = animation;
  const entranceName = a?.entranceClass
    ? ENTRANCE_CLASS[a.entranceClass as keyof typeof ENTRANCE_CLASS]
    : undefined;

  if (!entranceName || reduced || !mounted || (scope.editing && !scope.preview)) {
    return (
      <div className={className} style={style} {...rest}>
        {children}
      </div>
    );
  }

  const baseDelay = a?.delay ?? 0;
  const step = a?.stagger ?? STAGGER_STEP * 1000;
  const delayMs = baseDelay + (idx.current ?? 0) * step;
  const durationMs = a?.duration ?? 600;

  return (
    <div
      className={cn(className, 'animate__animated', entranceName)}
      style={
        {
          ...(style as CSSProperties),
          ['--animate-duration' as string]: `${durationMs}ms`,
          ['--animate-delay' as string]: `${delayMs}ms`,
        } as CSSProperties
      }
      data-motion=""
      {...rest}
    >
      {children}
    </div>
  );
}
