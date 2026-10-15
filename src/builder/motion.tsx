'use client';

import { motion, useReducedMotion, type TargetAndTransition, type Transition, type Variants } from 'motion/react';
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
import { deviceForWidth, pick, PAGE_TRANSITIONS, type Device, type Entrance, type ResolvedAnimation } from './style';

/* ---------- presets ---------- */

const HIDDEN: Record<Exclude<Entrance, 'none'>, TargetAndTransition> = {
  fade: { opacity: 0 },
  'fade-up': { opacity: 0, y: 32 },
  'fade-down': { opacity: 0, y: -32 },
  'slide-left': { opacity: 0, x: 48 },
  'slide-right': { opacity: 0, x: -48 },
  zoom: { opacity: 0, scale: 0.92 },
  blur: { opacity: 0, filter: 'blur(12px)' },
};
const SHOWN: TargetAndTransition = { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' };

const GLOW_OFF = '0 0 0 0 rgba(99, 102, 241, 0)';
const GLOW_ON = '0 18px 48px -16px rgba(99, 102, 241, 0.55)';
const HOVER: Record<'lift' | 'scale' | 'glow', TargetAndTransition> = {
  lift: { y: -6 },
  scale: { scale: 1.02 },
  glow: { boxShadow: GLOW_ON },
};

const STAGGER_STEP = 0.08;
/** Hover and click entrances start dimmed instead of invisible, so visitors can find what to interact with. */
const TEASER_OPACITY = 0.4;

const transitionFor = (a: ResolvedAnimation, delay = a.delay): Transition =>
  a.easing === 'spring'
    ? { type: 'spring', bounce: 0.25, duration: a.duration, delay }
    : { duration: a.duration, ease: [0.16, 1, 0.3, 1], delay };

/* ---------- scope: editor preview, page transition ---------- */

type Scope = { editing: boolean; preview: boolean };
const ScopeContext = createContext<Scope>({ editing: false, preview: false });

/**
 * The server cannot know the visitor's preference, so the first client render must match it (motion on);
 * otherwise React keeps the server's hidden styles and trigger attributes after hydration.
 */
function useReducedMotionAfterMount() {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!reduced;
}

/** Motion runs on the public site, and in the builder only while Motion preview is on. */
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

type ItemScope = { stagger: boolean; hover: ResolvedAnimation['hover']; item: Variants | null; active: boolean };
const ItemContext = createContext<ItemScope | null>(null);

/**
 * motion's `useInView` rejects nodes from another window, and the builder canvas is an iframe,
 * so the observer is created from the element's own window.
 */
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

type MotionSectionProps = {
  animation: ResolvedAnimation;
  hasItems?: boolean;
  className?: string;
  innerClassName?: string;
  style?: CSSProperties;
  id?: string;
  children: ReactNode;
};

/**
 * Wraps a block's `<section>` with its entrance, trigger, stagger, and hover presets.
 * Inactive states (reduced motion, a disabled device, or the builder without Motion preview) render the final frame.
 * Toggling Motion preview remounts the section so the entrance replays.
 */
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
  useEffect(() => setMounted(true), []);

  const active = enabled && !reduced && (device === null || a.devices[device]);
  const hasEntrance = a.entrance !== 'none';
  const stagger = hasEntrance && a.stagger === 'children' && !!hasItems;

  const shown =
    !active ||
    !hasEntrance ||
    (a.trigger === 'load' && mounted) ||
    (a.trigger === 'scroll' && inView) ||
    ((a.trigger === 'hover' || a.trigger === 'click') && interacted);

  const waitsForVisitor = a.trigger === 'hover' || a.trigger === 'click';
  const hidden = hasEntrance
    ? { ...HIDDEN[a.entrance as Exclude<Entrance, 'none'>], ...(waitsForVisitor && { opacity: TEASER_OPACITY }) }
    : SHOWN;
  const instant: Transition = { duration: 0 };
  const sectionVariants: Variants = stagger
    ? { hidden: {}, shown: { transition: { staggerChildren: STAGGER_STEP, delayChildren: a.delay } } }
    : { hidden, shown: { ...SHOWN, transition: active ? transitionFor(a) : instant } };
  const itemVariants: Variants | null = stagger
    ? { hidden, shown: { ...SHOWN, transition: active ? transitionFor(a, 0) : instant } }
    : null;

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

  const hoverOnSelf = a.hover !== 'none' && !hasItems && active;

  return (
    <ItemContext.Provider value={{ stagger, hover: a.hover, item: itemVariants, active }}>
      <motion.section
        ref={ref}
        id={id}
        data-motion
        className={cn(interactive && 'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--site-primary)]', className)}
        style={style}
        variants={sectionVariants}
        initial={enabled ? 'hidden' : false}
        animate={shown ? 'shown' : 'hidden'}
        {...triggerProps}
      >
        {hoverOnSelf ? (
          <motion.div
            className={innerClassName}
            style={a.hover === 'glow' ? { boxShadow: GLOW_OFF, borderRadius: 'var(--site-radius)' } : undefined}
            whileHover={HOVER[a.hover as keyof typeof HOVER]}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
          >
            {children}
          </motion.div>
        ) : (
          <div className={innerClassName}>{children}</div>
        )}
      </motion.section>
    </ItemContext.Provider>
  );
}

/** Stops a nested, non-animated section from inheriting stagger or hover from an animated parent such as Columns. */
export function MotionBoundary({ children }: { children: ReactNode }) {
  return <ItemContext.Provider value={null}>{children}</ItemContext.Provider>;
}

/* ---------- list items ---------- */

const ITEM_TAGS = { div: motion.div, figure: motion.figure, details: motion.details, li: motion.li };

type ItemTag = keyof typeof ITEM_TAGS;

/**
 * A repeated child (card, stat, plan, quote, FAQ row, column). Renders a plain element unless its section
 * staggers children or applies a hover effect, so layout is unchanged when motion is off.
 */
export function MotionItem({
  as = 'div',
  className,
  style,
  children,
  ...rest
}: { as?: ItemTag; className?: string; style?: CSSProperties; children?: ReactNode } & Omit<
  HTMLAttributes<HTMLElement>,
  'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'style' | 'className' | 'children'
> & { open?: boolean }) {
  const scope = useContext(ItemContext);
  const hover = scope?.active && scope.hover !== 'none' ? scope.hover : null;

  if (!scope || (!scope.stagger && !hover)) {
    const Tag = as;
    return (
      <Tag className={className} style={style} {...(rest as HTMLAttributes<HTMLElement>)}>
        {children}
      </Tag>
    );
  }

  const Motion = ITEM_TAGS[as] as typeof motion.div;
  return (
    <Motion
      className={className}
      data-motion
      style={hover === 'glow' ? { ...style, boxShadow: GLOW_OFF } : style}
      variants={scope.item ?? undefined}
      whileHover={hover ? HOVER[hover] : undefined}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </Motion>
  );
}
