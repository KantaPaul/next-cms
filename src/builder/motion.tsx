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
  return mounted && reduced;
}

const useMotionEnabled = () => {
  const scope = useContext(ScopeContext);
  return !scope.editing || scope.preview;
};

export function MotionScope({
  editing,
  preview,
  transition,
  children,
}: {
  editing: boolean;
  preview: boolean;
  transition?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotionAfterMount();
  const kind = pick(transition, PAGE_TRANSITIONS) ?? 'none';
  const run = !editing || preview;

  return (
    <ScopeContext.Provider value={{ editing, preview }}>
      {kind === 'none' ? (
        children
      ) : (
        <motion.div
          key={run ? 'run' : 'idle'}
          data-motion
          initial={run ? { opacity: 0, y: kind === 'slide-up' ? 24 : 0 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      )}
    </ScopeContext.Provider>
  );
}

/* ---------- section ---------- */

type ItemScope = {
  stagger: boolean;
  hoverClass: string | null;
  active: boolean;
  baseDelay: number;
  duration: number;
  easing: string;
};
const ItemContext = createContext<ItemScope | null>(null);

function useInViewport(ref: React.RefObject<HTMLElement | null>, once: boolean, amount: number) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    const view = el?.ownerDocument.defaultView;
    if (!el || !view?.IntersectionObserver) return;
    const observer = new view.IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold: amount }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, once, amount]);
  return inView;
}

function useDevice(ref: React.RefObject<HTMLElement | null>) {
  const [device, setDevice] = useState<Device | null>(null);
  useEffect(() => {
    const view = ref.current?.ownerDocument.defaultView;
    if (!view) return;
    const update = () => setDevice(deviceForWidth(view.innerWidth));
    update();
    view.addEventListener('resize', update);
    return () => view.removeEventListener('resize', update);
  }, [ref]);
  return device;
}

const timingStyle = (duration: number, delay: number, easing: ResolvedAnimation['easing']): CSSProperties => ({
  ['--animate-duration' as string]: `${duration}s`,
  ['--animate-delay' as string]: `${delay}s`,
  animationDuration: `${duration}s`,
  animationDelay: `${delay}s`,
  animationTimingFunction: easing === 'spring' ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'cubic-bezier(0.16, 1, 0.3, 1)',
  animationFillMode: 'both',
});

type MotionSectionProps = {
  animation: ResolvedAnimation;
  hasItems?: boolean;
  className?: string;
  innerClassName?: string;
  style?: CSSProperties;
  id?: string;
  children: ReactNode;
};

export function MotionSection(props: MotionSectionProps) {
  const enabled = useMotionEnabled();
  return <MotionSectionInner key={enabled ? 'on' : 'off'} enabled={enabled} {...props} />;
}

function MotionSectionInner({
  animation: a,
  hasItems,
  className,
  innerClassName,
  style,
  id,
  children,
  enabled,
}: MotionSectionProps & { enabled: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotionAfterMount();
  const device = useDevice(ref);
  const inView = useInViewport(ref, a.once, 0.2);
  const [mounted, setMounted] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [exited, setExited] = useState(false);
  useEffect(() => setMounted(true), []);

  const active = enabled && !reduced && (device === null || a.devices[device]);
  const hasEntrance = a.entrance !== 'none';
  const hasExit = a.exit !== 'none';
  const attention = ATTENTION_SEEKERS.has(a.entrance);
  const stagger = hasEntrance && a.stagger === 'children' && !!hasItems;

  const shown =
    !active ||
    !hasEntrance ||
    attention ||
    (a.trigger === 'load' && mounted) ||
    (a.trigger === 'scroll' && inView) ||
    ((a.trigger === 'hover' || a.trigger === 'click') && interacted);

  useEffect(() => {
    if (!active || !hasExit) return;
    if (a.trigger === 'scroll' || a.trigger === 'load') {
      if (!inView && shown) setExited(true);
      else if (inView) setExited(false);
    }
  }, [active, hasExit, a.trigger, inView, shown]);

  const waitsForVisitor = a.trigger === 'hover' || a.trigger === 'click';
  const interactive = active && hasEntrance && waitsForVisitor;
  const setShown = (next: boolean) => setInteracted(prev => (a.once ? prev || next : next));
  const triggerProps: Pick<
    HTMLAttributes<HTMLElement>,
    'onMouseEnter' | 'onMouseLeave' | 'onFocus' | 'onBlur' | 'onClick' | 'onKeyDown' | 'tabIndex' | 'role' | 'aria-expanded'
  > = !interactive
    ? {}
    : a.trigger === 'hover'
      ? {
          onMouseEnter: () => setShown(true),
          onMouseLeave: () => setShown(false),
          onFocus: () => setShown(true),
          onBlur: () => setShown(false),
          tabIndex: 0,
        }
      : {
          onClick: () => setShown(!interacted),
          onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
            if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
            e.preventDefault();
            setShown(!interacted);
          },
          tabIndex: 0,
          role: 'button',
          'aria-expanded': interacted,
        };

  const entranceClass =
    active && hasEntrance && shown && !exited
      ? a.entrance === 'blur'
        ? 's-entrance-blur'
        : (ENTRANCE_CLASS[a.entrance] ?? '')
      : '';
  const exitClass = active && hasExit && exited ? (EXIT_CLASS[a.exit] ?? '') : '';
  const hoverClass = active && a.hover !== 'none' && !hasItems ? (HOVER_CLASS[a.hover] ?? null) : null;
  const hold = active && hasEntrance && !attention && !shown && !exited;

  const animStyle: CSSProperties = {
    ...style,
    ...(entranceClass || exitClass ? timingStyle(a.duration, a.delay, a.easing) : {}),
  };

  return (
    <ItemContext.Provider
      value={{
        stagger,
        hoverClass: active && a.hover !== 'none' && hasItems ? (HOVER_CLASS[a.hover] ?? null) : null,
        active,
        baseDelay: a.delay,
        duration: a.duration,
        easing: a.easing === 'spring' ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <section
        ref={ref}
        id={id}
        data-motion
        data-motion-hold={hold ? '' : undefined}
        className={cn(
          interactive && 'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--site-primary)]',
          entranceClass,
          exitClass,
          hoverClass,
          className
        )}
        style={{
          ...animStyle,
          ...(hold ? { opacity: waitsForVisitor ? 0.4 : 0 } : {}),
        }}
        {...triggerProps}
      >
        <div className={innerClassName}>{children}</div>
      </section>
    </ItemContext.Provider>
  );
}

export function MotionBoundary({ children }: { children: ReactNode }) {
  return <ItemContext.Provider value={null}>{children}</ItemContext.Provider>;
}

/* ---------- list items ---------- */

const ITEM_TAGS = { div: 'div', figure: 'figure', details: 'details', li: 'li' } as const;
type ItemTag = keyof typeof ITEM_TAGS;

export function MotionItem({
  as = 'div',
  className,
  style,
  children,
  index = 0,
  ...rest
}: {
  as?: ItemTag;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  index?: number;
} & Omit<HTMLAttributes<HTMLElement>, 'style' | 'className' | 'children'>) {
  const scope = useContext(ItemContext);
  const Tag = ITEM_TAGS[as];

  if (!scope || (!scope.stagger && !scope.hoverClass)) {
    return (
      <Tag className={className} style={style} {...rest}>
        {children}
      </Tag>
    );
  }

  const delay = scope.baseDelay + index * STAGGER_STEP;
  const itemStyle: CSSProperties = {
    ...style,
    ...(scope.stagger
      ? {
          ['--animate-duration' as string]: `${scope.duration}s`,
          ['--animate-delay' as string]: `${delay}s`,
          animationDuration: `${scope.duration}s`,
          animationDelay: `${delay}s`,
          animationTimingFunction: scope.easing,
          animationFillMode: 'both',
        }
      : {}),
  };

  return (
    <Tag
      className={cn(className, scope.hoverClass)}
      data-motion
      style={itemStyle}
      {...rest}
    >
      {children}
    </Tag>
  );
}
