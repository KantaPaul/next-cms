/** Elementor-style animation allowlists (no React imports). */

export const ENTRANCE_GROUPS = {
  Fading: ['fadeIn', 'fadeInDown', 'fadeInLeft', 'fadeInRight', 'fadeInUp'] as const,
  Zooming: ['zoomIn', 'zoomInDown', 'zoomInLeft', 'zoomInRight', 'zoomInUp'] as const,
  Bouncing: ['bounceIn', 'bounceInDown', 'bounceInLeft', 'bounceInRight', 'bounceInUp'] as const,
  Sliding: ['slideInDown', 'slideInLeft', 'slideInRight', 'slideInUp'] as const,
  Rotating: ['rotateIn', 'rotateInDownLeft', 'rotateInDownRight', 'rotateInUpLeft', 'rotateInUpRight'] as const,
  'Attention seekers': ['bounce', 'flash', 'pulse', 'rubberBand', 'shakeX', 'shakeY', 'headShake', 'swing', 'tada', 'wobble', 'jello', 'heartBeat'] as const,
  'Light speed': ['lightSpeedInLeft', 'lightSpeedInRight'] as const,
  Specials: ['rollIn', 'jackInTheBox', 'blur'] as const,
} as const;

export const EXIT_GROUPS = {
  Fading: ['fadeOut', 'fadeOutDown', 'fadeOutLeft', 'fadeOutRight', 'fadeOutUp'] as const,
  Zooming: ['zoomOut', 'zoomOutDown', 'zoomOutLeft', 'zoomOutRight', 'zoomOutUp'] as const,
  Bouncing: ['bounceOut', 'bounceOutDown', 'bounceOutLeft', 'bounceOutRight', 'bounceOutUp'] as const,
  Sliding: ['slideOutDown', 'slideOutLeft', 'slideOutRight', 'slideOutUp'] as const,
  Rotating: ['rotateOut', 'rotateOutDownLeft', 'rotateOutDownRight', 'rotateOutUpLeft', 'rotateOutUpRight'] as const,
  'Light speed': ['lightSpeedOutLeft', 'lightSpeedOutRight'] as const,
  Specials: ['rollOut', 'hinge'] as const,
} as const;

export const HOVER_GROUPS = {
  Grow: ['grow', 'shrink', 'pulse', 'pulse-grow', 'pulse-shrink'] as const,
  Bounce: ['push', 'pop', 'bounce-in', 'bounce-out'] as const,
  Rotate: ['rotate', 'grow-rotate'] as const,
  Float: ['float', 'sink', 'bob', 'hang'] as const,
  Skew: ['skew', 'skew-forward', 'skew-backward'] as const,
  Wobble: ['wobble-horizontal', 'wobble-vertical', 'wobble-to-bottom-right', 'wobble-to-top-right', 'wobble-top', 'wobble-bottom', 'wobble-skew'] as const,
  Buzz: ['buzz', 'buzz-out', 'glow'] as const,
} as const;

const flat = <T extends string>(groups: Record<string, readonly T[]>) =>
  ['none' as const, ...Object.values(groups).flatMap(g => [...g])] as const;

export const ENTRANCES = flat(ENTRANCE_GROUPS);
export const EXITS = flat(EXIT_GROUPS);
export const HOVERS = flat(HOVER_GROUPS);

export const ENTRANCE_ALIASES: Record<string, (typeof ENTRANCES)[number]> = {
  fade: 'fadeIn',
  'fade-up': 'fadeInUp',
  'fade-down': 'fadeInDown',
  'slide-left': 'slideInLeft',
  'slide-right': 'slideInRight',
  zoom: 'zoomIn',
  blur: 'blur',
};
export const HOVER_ALIASES: Record<string, (typeof HOVERS)[number]> = {
  lift: 'float',
  scale: 'grow',
  glow: 'glow',
};

export const ENTRANCE_CLASS: Partial<Record<(typeof ENTRANCES)[number], string>> = Object.fromEntries(
  ENTRANCES.filter(k => k !== 'none' && k !== 'blur').map(k => [k, `animate__animated animate__${k}`])
);
export const EXIT_CLASS: Partial<Record<(typeof EXITS)[number], string>> = Object.fromEntries(
  EXITS.filter(k => k !== 'none').map(k => [k, `animate__animated animate__${k}`])
);
export const HOVER_CLASS: Partial<Record<(typeof HOVERS)[number], string>> = Object.fromEntries(
  HOVERS.filter(k => k !== 'none').map(k => [k, `s-hvr-${k}`])
);

export const ATTENTION_SEEKERS = new Set<string>(ENTRANCE_GROUPS['Attention seekers']);
