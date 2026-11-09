import type {
  LengthUnit,
  Responsive,
  Sides,
  SpacingUnit,
} from '@/builder/style';

export {
  OVERLAY_HREF_PREFIX,
  overlayHref,
  parseOverlayHref,
} from './href';

export type PathRuleKind = 'all' | 'exact' | 'prefix' | 'post-type' | 'entity';

export type PathRule = {
  kind: PathRuleKind;
  value: string;
};

export type OverlayTriggerType = 'load' | 'delay' | 'scroll' | 'exit' | 'click';

export type OverlayTrigger = {
  type: OverlayTriggerType;
  delaySec?: number;
  scrollPercent?: number;
  selector?: string;
};

export type PopupPosition =
  | 'center'
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export type DrawerPosition = 'left' | 'right' | 'top' | 'bottom';

export type OverlayPosition = PopupPosition | DrawerPosition;

/** A per-device length. An empty `value` means "not set" (see `layout-style.ts`). */
export type OverlayLength = {
  value?: Responsive<number>;
  unit?: LengthUnit;
};

export type OverlayPadding = {
  value?: Responsive<Sides>;
  unit?: SpacingUnit;
};

export type OverlayBackdrop = {
  color: string;
  /** 0–100. Kept apart from the color because the color picker has no alpha. */
  opacity: number;
};

/**
 * Saved pages may still hold the older shapes of these fields (`'480px'`,
 * `'md'`, `'rgba(0,0,0,0.5)'`); `readOverlayLayout` converts them on read.
 */
export type OverlayLayout = {
  width?: OverlayLength;
  /** An empty `value` fits the content. */
  maxHeight?: OverlayLength;
  position: OverlayPosition;
  overlay: boolean;
  overlayColor?: OverlayBackdrop;
  closeOnOverlay: boolean;
  closeOnEsc: boolean;
  showCloseButton: boolean;
  animation?: 'fade' | 'scale' | 'slide' | 'none';
  radius?: OverlayLength;
  padding?: OverlayPadding;
  background?: string;
};

export type OverlayTargeting = {
  include: PathRule[];
  exclude: PathRule[];
  userState: 'all' | 'guest' | 'logged-in';
  devices: ('desktop' | 'tablet' | 'mobile')[];
};

export type OverlayFrequencyMode =
  | 'every-page'
  | 'once-session'
  | 'once-per-days'
  | 'once-ever';

export type OverlayFrequency = {
  mode: OverlayFrequencyMode;
  days?: number;
  stopAfterConversion: boolean;
};

export type OverlaySettings = {
  enabled: boolean;
  startsAt?: string;
  endsAt?: string;
  layout: OverlayLayout;
  trigger: OverlayTrigger;
  targeting: OverlayTargeting;
  frequency: OverlayFrequency;
};

export type OverlayStorageState = {
  viewCount: number;
  lastViewedAt?: number;
  sessionViewed?: boolean;
  converted?: boolean;
  convertedAt?: number;
};

export const DEFAULT_POPUP_SETTINGS: OverlaySettings = {
  enabled: true,
  layout: {
    width: { value: { desktop: 480 }, unit: 'px' },
    maxHeight: { value: { desktop: 90 }, unit: 'vh' },
    position: 'center',
    overlay: true,
    overlayColor: { color: '#000000', opacity: 50 },
    closeOnOverlay: true,
    closeOnEsc: true,
    showCloseButton: true,
    animation: 'scale',
    radius: { value: { desktop: 14 }, unit: 'px' },
    padding: {
      value: { desktop: { top: 24, right: 24, bottom: 24, left: 24 } },
      unit: 'px',
    },
    background: '#ffffff',
  },
  trigger: {
    type: 'delay',
    delaySec: 3,
  },
  targeting: {
    include: [{ kind: 'all', value: '' }],
    exclude: [],
    userState: 'all',
    devices: ['desktop', 'tablet', 'mobile'],
  },
  frequency: {
    mode: 'once-session',
    days: 7,
    stopAfterConversion: true,
  },
};

export const DEFAULT_DRAWER_SETTINGS: OverlaySettings = {
  enabled: true,
  layout: {
    width: { value: { desktop: 400 }, unit: 'px' },
    maxHeight: { value: { desktop: 100 }, unit: 'vh' },
    position: 'right',
    overlay: true,
    overlayColor: { color: '#000000', opacity: 40 },
    closeOnOverlay: true,
    closeOnEsc: true,
    showCloseButton: true,
    animation: 'slide',
    radius: { value: { desktop: 0 }, unit: 'px' },
    padding: {
      value: { desktop: { top: 24, right: 24, bottom: 24, left: 24 } },
      unit: 'px',
    },
    background: '#ffffff',
  },
  trigger: {
    type: 'click',
    selector: '',
  },
  targeting: {
    include: [{ kind: 'all', value: '' }],
    exclude: [],
    userState: 'all',
    devices: ['desktop', 'tablet', 'mobile'],
  },
  frequency: {
    mode: 'every-page',
    days: 7,
    stopAfterConversion: false,
  },
};
