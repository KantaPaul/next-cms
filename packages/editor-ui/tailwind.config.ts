/** @type {import('tailwindcss').Config} */
import animation from 'tailwindcss-animate';

export default {
  darkMode: ['class', '[data-ne-theme="dark"]'],
  content: [
    './src/**/*.{ts,tsx}',
    './tokens.css',
  ],
  theme: {
    extend: {
      fontFamily: {
        ui: ['var(--ne-font-ui)'],
        mono: ['var(--ne-font-mono)'],
      },
      borderRadius: {
        sm: 'var(--ne-radius-sm)',
        md: 'var(--ne-radius-md)',
        lg: 'var(--ne-radius-lg)',
      },
      colors: {
        neBg: 'var(--ne-bg)',
        neSurface: 'var(--ne-surface)',
        neBorder: 'var(--ne-border)',
        neText: 'var(--ne-text)',
        neTextMuted: 'var(--ne-text-muted)',
        nePrimary: 'var(--ne-primary)',
        nePrimarySoft: 'var(--ne-primary-soft)',
        neSuccess: 'var(--ne-success)',
        neWarning: 'var(--ne-warning)',
        neDanger: 'var(--ne-danger)',
        neSpacing1: 'var(--ne-spacing-1)',
        neSpacing2: 'var(--ne-spacing-2)',
        neSpacing3: 'var(--ne-spacing-3)',
        neSpacing4: 'var(--ne-spacing-4)',
        neSpacing6: 'var(--ne-spacing-6)',
        neSpacing8: 'var(--ne-spacing-8)',
        neRadiusSm: 'var(--ne-radius-sm)',
        neRadiusMd: 'var(--ne-radius-md)',
        neRadiusLg: 'var(--ne-radius-lg)',
        neFontUi: 'var(--ne-font-ui)',
        neFontMono: 'var(--ne-font-mono)',
        neShadowSm: 'var(--ne-shadow-sm)',
        neShadowMd: 'var(--ne-shadow-md)',
        neTransitionFast: 'var(--ne-transition-fast)',
        neTransitionBase: 'var(--ne-transition-base)',
      },
    },
  },
  plugins: [
    animation,
  ],
}