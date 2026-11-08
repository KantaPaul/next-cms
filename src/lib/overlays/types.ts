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

export type OverlayLayout = {
  width?: string;
  maxHeight?: string;
  position: OverlayPosition;
  overlay: boolean;
  overlayColor?: string;
  closeOnOverlay: boolean;
  closeOnEsc: boolean;
  showCloseButton: boolean;
  animation?: 'fade' | 'scale' | 'slide' | 'none';
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
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
    width: '480px',
    maxHeight: '90vh',
    position: 'center',
    overlay: true,
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    closeOnOverlay: true,
    closeOnEsc: true,
    showCloseButton: true,
    animation: 'scale',
    radius: 'md',
    padding: 'md',
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
    width: '400px',
    maxHeight: '100vh',
    position: 'right',
    overlay: true,
    overlayColor: 'rgba(0, 0, 0, 0.4)',
    closeOnOverlay: true,
    closeOnEsc: true,
    showCloseButton: true,
    animation: 'slide',
    radius: 'none',
    padding: 'md',
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
