/** @type {import('tailwindcss').Config} */
import containerQueries from '@tailwindcss/container-queries';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import plugin from 'tailwindcss/plugin';
import animate from 'tailwindcss-animate';

// shadcn/ui tokens live in globals.css as oklch() variables; color-mix keeps `/opacity` modifiers working.
const token = (name: string) => ({ opacityValue }: { opacityValue?: string }) =>
  opacityValue === undefined
    ? `var(--${name})`
    : `color-mix(in oklch, var(--${name}) calc(${opacityValue} * 100%), transparent)`;

const shadcnColors = {
  background: token('background'),
  foreground: token('foreground'),
  card: { DEFAULT: token('card'), foreground: token('card-foreground') },
  popover: { DEFAULT: token('popover'), foreground: token('popover-foreground') },
  primary: { DEFAULT: token('primary'), foreground: token('primary-foreground') },
  secondary: { DEFAULT: token('secondary'), foreground: token('secondary-foreground') },
  muted: { DEFAULT: token('muted'), foreground: token('muted-foreground') },
  accent: { DEFAULT: token('accent'), foreground: token('accent-foreground') },
  destructive: { DEFAULT: token('destructive'), foreground: token('primary-foreground') },
  border: token('border'),
  input: token('input'),
  ring: token('ring'),
  sidebar: {
    DEFAULT: token('sidebar'),
    foreground: token('sidebar-foreground'),
    primary: token('sidebar-primary'),
    'primary-foreground': token('sidebar-primary-foreground'),
    accent: token('sidebar-accent'),
    'accent-foreground': token('sidebar-accent-foreground'),
    border: token('sidebar-border'),
    ring: token('sidebar-ring'),
  },
};

module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  // The content section of your tailwind.config.js file is where you configure the paths to all of your HTML templates, JavaScript components, and any other source files that contain Tailwind class names
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  // Add a safelist of classes that are always included
  // safelist: [
  //   // Add any critical classes here that might be dynamically created
  //   // This reduces the need to generate all possible variants
  //   'bg-red-500',
  //   'bg-green-500',
  //   'bg-blue-500',
  //   'text-red-500',
  //   'text-green-500',
  //   'text-blue-500',
  //   // RBC calendar classes - use pattern instead of regex
  //   /^rbc-/
  // ],
  future: {
    // Use newer features that improve CSS size
    hoverOnlyWhenSupported: true,
    respectDefaultRingColorOpacity: true,
    disableColorOpacityUtilitiesByDefault: true,
    relativeContentPathsByDefault: true,
  },
  theme: {
    extend: {
      colors: {
        ...shadcnColors,
        red: {
          lighter: 'rgb(var(--red-lighter) / <alpha-value>)',
          DEFAULT: 'rgb(var(--red-default) / <alpha-value>)',
          dark: 'rgb(var(--red-dark) / <alpha-value>)',
          custom: 'rgb(var(--red-alert) / <alpha-value>)',
        },
        steel: {
          50: '#f6f7f9',
          100: '#eaedf1',
          200: '#d6d9e3',
          300: '#b1b9c9',
          400: '#82889B',
          500: '#666666',
          600: '#3b404f',
          700: '#1b1e27',
          800: '#15171e',
          900: '#111318',
          DEFAULT: '#1B1E27',
        },
        dark: {
          50: '#0D1120',
          100: '#121725',
          200: '#192030',
          280: '#19202E',
          300: '#242E3F',
          350: '#272b3a',
          400: '#2E394B',
          500: '#4E5D74',
          600: '#6B788E',
          700: '#8292AA',
          800: ' #AAB5C4',
          900: '#F6F8FB',
          DEFAULT: '#2E394B',
        },
      },
    },
  },
  plugins: [
    forms,
    containerQueries,
    animate,
    typography,
    plugin(({ addVariant }) => {
      // required this to prevent any style on readOnly input elements
      addVariant('not-read-only', '&:not(:read-only)');
      addVariant('not-disabled', '&:not([disabled])');
    }),
  ],
};
