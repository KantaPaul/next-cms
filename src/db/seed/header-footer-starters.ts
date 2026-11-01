import type { BuilderData, BuilderItem } from '@/builder/data';

export type StarterTemplate = {
  key: string;
  name: string;
  description: string;
  category: 'Header' | 'Footer';
  content: BuilderData;
};

/* =========================================================================
   Header Starters
   ========================================================================= */

export const HEADER_STARTER_CLASSIC: StarterTemplate = {
  key: 'classic',
  name: 'Classic Header',
  description: 'Logo left, navigation links center, search & call-to-action button right.',
  category: 'Header',
  content: {
    root: {
      props: {
        sticky: 'off',
        transparent: false,
        shrinkOnScroll: false,
        hideOnScrollDown: false,
        shadow: 'none',
        zIndex: 50,
      },
    },
    content: [
      {
        type: 'HeaderBar',
        props: {
          id: 'header-bar-main',
          width: 'boxed',
          background: 'default',
          paddingY: 'sm',
          align: 'center',
          borderBottom: true,
        },
      },
    ],
    zones: {
      'header-bar-main:left': [
        {
          type: 'Logo',
          props: {
            id: 'header-logo',
            source: 'site',
            width: 140,
            link: '/',
            showSiteName: true,
          },
        },
      ],
      'header-bar-main:center': [
        {
          type: 'NavMenu',
          props: {
            id: 'header-nav',
            location: 'header',
            orientation: 'horizontal',
            activeStyle: 'underline',
          },
        },
      ],
      'header-bar-main:right': [
        {
          type: 'SearchBox',
          props: {
            id: 'header-search',
            mode: 'icon-modal',
            placeholder: 'Search site...',
          },
        },
        {
          type: 'Button',
          props: {
            id: 'header-cta',
            text: 'Get Started',
            link: '/contact',
            variant: 'primary',
            size: 'sm',
          },
        },
        {
          type: 'MobileMenu',
          props: {
            id: 'header-mobile',
            breakpoint: 'mobile',
            drawerSide: 'right',
            icon: 'menu',
          },
        },
      ],
    },
  },
};

export const HEADER_STARTER_CENTERED: StarterTemplate = {
  key: 'centered',
  name: 'Centered Logo Header',
  description: 'Social links left, prominent centered brand logo, search right, navigation below.',
  category: 'Header',
  content: {
    root: {
      props: {
        sticky: 'off',
        transparent: false,
        shrinkOnScroll: false,
        hideOnScrollDown: false,
        shadow: 'none',
        zIndex: 50,
      },
    },
    content: [
      {
        type: 'HeaderBar',
        props: {
          id: 'header-bar-top',
          width: 'boxed',
          background: 'default',
          paddingY: 'sm',
          align: 'center',
          borderBottom: false,
        },
      },
      {
        type: 'HeaderBar',
        props: {
          id: 'header-bar-bottom',
          width: 'boxed',
          background: 'muted',
          paddingY: 'xs',
          align: 'center',
          borderBottom: true,
        },
      },
    ],
    zones: {
      'header-bar-top:left': [
        {
          type: 'SocialIcons',
          props: {
            id: 'header-social',
            shape: 'plain',
            size: 'sm',
            items: [
              { network: 'x', url: 'https://x.com', label: 'X' },
              { network: 'github', url: 'https://github.com', label: 'GitHub' },
              { network: 'linkedin', url: 'https://linkedin.com', label: 'LinkedIn' },
            ],
          },
        },
      ],
      'header-bar-top:center': [
        {
          type: 'Logo',
          props: {
            id: 'header-logo',
            source: 'site',
            width: 160,
            link: '/',
            showSiteName: true,
          },
        },
      ],
      'header-bar-top:right': [
        {
          type: 'SearchBox',
          props: {
            id: 'header-search',
            mode: 'icon-modal',
            placeholder: 'Search...',
          },
        },
        {
          type: 'MobileMenu',
          props: {
            id: 'header-mobile',
            breakpoint: 'mobile',
            drawerSide: 'right',
          },
        },
      ],
      'header-bar-bottom:center': [
        {
          type: 'NavMenu',
          props: {
            id: 'header-nav',
            location: 'header',
            orientation: 'horizontal',
            activeStyle: 'pills',
          },
        },
      ],
    },
  },
};

export const HEADER_STARTER_MINIMAL: StarterTemplate = {
  key: 'minimal',
  name: 'Minimal Clean Header',
  description: 'Compact sticky bar with brand logo and navigation menu.',
  category: 'Header',
  content: {
    root: {
      props: {
        sticky: 'always',
        transparent: false,
        shrinkOnScroll: false,
        hideOnScrollDown: false,
        shadow: 'on-scroll',
        zIndex: 50,
      },
    },
    content: [
      {
        type: 'HeaderBar',
        props: {
          id: 'header-bar-minimal',
          width: 'boxed',
          background: 'default',
          paddingY: 'sm',
          align: 'center',
          borderBottom: true,
        },
      },
    ],
    zones: {
      'header-bar-minimal:left': [
        {
          type: 'Logo',
          props: {
            id: 'header-logo',
            source: 'site',
            width: 130,
            link: '/',
            showSiteName: true,
          },
        },
      ],
      'header-bar-minimal:right': [
        {
          type: 'NavMenu',
          props: {
            id: 'header-nav',
            location: 'header',
            orientation: 'horizontal',
            activeStyle: 'subtle',
          },
        },
        {
          type: 'MobileMenu',
          props: {
            id: 'header-mobile',
            breakpoint: 'mobile',
            drawerSide: 'right',
          },
        },
      ],
    },
  },
};

export const HEADER_STARTER_WITH_TOPBAR: StarterTemplate = {
  key: 'with-topbar',
  name: 'Header with Top Bar',
  description: 'Top announcement & contact bar with main navigation and action button.',
  category: 'Header',
  content: {
    root: {
      props: {
        sticky: 'always',
        transparent: false,
        shrinkOnScroll: true,
        hideOnScrollDown: true,
        shadow: 'on-scroll',
        zIndex: 50,
      },
    },
    content: [
      {
        type: 'AnnouncementBar',
        props: {
          id: 'header-announcement',
          text: '✨ Welcome to our newly upgraded site experience! Check out our updates.',
          link: '/blog',
          dismissible: true,
          dismissDays: 7,
        },
      },
      {
        type: 'HeaderBar',
        props: {
          id: 'header-bar-top',
          width: 'boxed',
          background: 'muted',
          paddingY: 'xs',
          align: 'center',
          borderBottom: true,
        },
      },
      {
        type: 'HeaderBar',
        props: {
          id: 'header-bar-main',
          width: 'boxed',
          background: 'default',
          paddingY: 'sm',
          align: 'center',
          borderBottom: true,
        },
      },
    ],
    zones: {
      'header-bar-top:left': [
        {
          type: 'ContactInfo',
          props: {
            id: 'top-contact',
            layout: 'horizontal',
            showIcons: true,
            items: [
              { kind: 'email', value: 'hello@example.com', label: 'Email' },
              { kind: 'phone', value: '+1 (555) 019-2834', label: 'Phone' },
            ],
          },
        },
      ],
      'header-bar-top:right': [
        {
          type: 'SocialIcons',
          props: {
            id: 'top-social',
            shape: 'plain',
            size: 'sm',
            items: [
              { network: 'x', url: 'https://x.com', label: 'X' },
              { network: 'github', url: 'https://github.com', label: 'GitHub' },
              { network: 'linkedin', url: 'https://linkedin.com', label: 'LinkedIn' },
            ],
          },
        },
      ],
      'header-bar-main:left': [
        {
          type: 'Logo',
          props: {
            id: 'header-logo',
            source: 'site',
            width: 140,
            link: '/',
            showSiteName: true,
          },
        },
      ],
      'header-bar-main:center': [
        {
          type: 'NavMenu',
          props: {
            id: 'header-nav',
            location: 'header',
            orientation: 'horizontal',
            activeStyle: 'underline',
          },
        },
      ],
      'header-bar-main:right': [
        {
          type: 'Button',
          props: {
            id: 'header-cta',
            text: 'Book a demo',
            link: '/contact',
            variant: 'primary',
            size: 'sm',
          },
        },
        {
          type: 'MobileMenu',
          props: {
            id: 'header-mobile',
            breakpoint: 'mobile',
            drawerSide: 'right',
          },
        },
      ],
    },
  },
};

/* =========================================================================
   Footer Starters
   ========================================================================= */

export const FOOTER_STARTER_COLUMNS_4: StarterTemplate = {
  key: 'columns-4',
  name: 'Four Columns Footer',
  description: 'Rich footer with brand overview, product links, company links, newsletter, and legal bar.',
  category: 'Footer',
  content: {
    root: {
      props: {
        background: 'default',
        paddingY: 'lg',
      },
    },
    content: [
      {
        type: 'FooterColumns',
        props: {
          id: 'footer-cols-main',
          width: 'boxed',
          background: 'default',
          paddingY: 'lg',
          columns: 4,
          gap: 'lg',
        },
      },
      {
        type: 'FooterColumns',
        props: {
          id: 'footer-cols-bottom',
          width: 'boxed',
          background: 'muted',
          paddingY: 'sm',
          columns: 1,
          gap: 'sm',
        },
      },
    ],
    zones: {
      'footer-cols-main:col1': [
        {
          type: 'Logo',
          props: {
            id: 'footer-logo',
            source: 'site',
            width: 130,
            link: '/',
            showSiteName: true,
          },
        },
        {
          type: 'RichText',
          props: {
            id: 'footer-about',
            content:
              '<p class="text-xs text-steel-500 dark:text-steel-400 mt-2">Empowering teams to build, edit, and ship fast modern web experiences.</p>',
          },
        },
      ],
      'footer-cols-main:col2': [
        {
          type: 'FooterLinks',
          props: {
            id: 'footer-links-product',
            heading: 'Product',
            source: 'manual',
            links: [
              { label: 'Features', url: '/#features' },
              { label: 'Pricing', url: '/pricing' },
              { label: 'Changelog', url: '/blog' },
              { label: 'Documentation', url: '/docs' },
            ],
          },
        },
      ],
      'footer-cols-main:col3': [
        {
          type: 'FooterLinks',
          props: {
            id: 'footer-links-company',
            heading: 'Company',
            source: 'manual',
            links: [
              { label: 'About Us', url: '/about' },
              { label: 'Contact Support', url: '/contact' },
              { label: 'Careers', url: '/careers' },
              { label: 'Press Kit', url: '/press' },
            ],
          },
        },
      ],
      'footer-cols-main:col4': [
        {
          type: 'Newsletter',
          props: {
            id: 'footer-newsletter',
            title: 'Subscribe',
            description: 'Get our latest updates and articles directly to your inbox.',
            buttonText: 'Join',
          },
        },
      ],
      'footer-cols-bottom:col1': [
        {
          type: 'Copyright',
          props: {
            id: 'footer-copyright',
            text: '© {year} {site_name}. All rights reserved.',
            align: 'center',
          },
        },
        {
          type: 'LegalLinks',
          props: {
            id: 'footer-legal',
            source: 'manual',
            separator: 'dot',
            align: 'center',
            links: [
              { label: 'Privacy Policy', url: '/privacy' },
              { label: 'Terms of Service', url: '/terms' },
              { label: 'Cookie Settings', url: '/cookies' },
            ],
          },
        },
        {
          type: 'SocialIcons',
          props: {
            id: 'footer-social',
            shape: 'round',
            size: 'sm',
            align: 'center',
            items: [
              { network: 'x', url: 'https://x.com', label: 'X' },
              { network: 'github', url: 'https://github.com', label: 'GitHub' },
              { network: 'linkedin', url: 'https://linkedin.com', label: 'LinkedIn' },
              { network: 'youtube', url: 'https://youtube.com', label: 'YouTube' },
            ],
          },
        },
      ],
    },
  },
};

export const FOOTER_STARTER_CENTERED: StarterTemplate = {
  key: 'simple-centered',
  name: 'Simple Centered Footer',
  description: 'Minimalist centered footer with brand mark, social links, legal navigation, and copyright.',
  category: 'Footer',
  content: {
    root: {
      props: {
        background: 'default',
        paddingY: 'lg',
      },
    },
    content: [
      {
        type: 'FooterColumns',
        props: {
          id: 'footer-cols-centered',
          width: 'boxed',
          background: 'default',
          paddingY: 'md',
          columns: 1,
          gap: 'md',
        },
      },
    ],
    zones: {
      'footer-cols-centered:col1': [
        {
          type: 'Logo',
          props: {
            id: 'footer-logo',
            source: 'site',
            width: 140,
            link: '/',
            showSiteName: true,
          },
        },
        {
          type: 'SocialIcons',
          props: {
            id: 'footer-social',
            shape: 'round',
            size: 'md',
            align: 'center',
            items: [
              { network: 'x', url: 'https://x.com', label: 'X' },
              { network: 'github', url: 'https://github.com', label: 'GitHub' },
              { network: 'linkedin', url: 'https://linkedin.com', label: 'LinkedIn' },
              { network: 'youtube', url: 'https://youtube.com', label: 'YouTube' },
            ],
          },
        },
        {
          type: 'LegalLinks',
          props: {
            id: 'footer-legal',
            source: 'manual',
            separator: 'pipe',
            align: 'center',
            links: [
              { label: 'Privacy Policy', url: '/privacy' },
              { label: 'Terms of Service', url: '/terms' },
              { label: 'Security', url: '/security' },
              { label: 'Contact', url: '/contact' },
            ],
          },
        },
        {
          type: 'Copyright',
          props: {
            id: 'footer-copyright',
            text: '© {year} {site_name}. All rights reserved.',
            align: 'center',
          },
        },
      ],
    },
  },
};

export const FOOTER_STARTER_DARK_NEWSLETTER: StarterTemplate = {
  key: 'dark-newsletter',
  name: 'Dark Footer with Newsletter',
  description: 'High-contrast inverted footer featuring newsletter subscription, contact info, and back-to-top button.',
  category: 'Footer',
  content: {
    root: {
      props: {
        background: 'inverted',
        paddingY: 'lg',
      },
    },
    content: [
      {
        type: 'FooterColumns',
        props: {
          id: 'footer-cols-top',
          width: 'boxed',
          background: 'inverted',
          paddingY: 'lg',
          columns: 1,
          gap: 'md',
        },
      },
      {
        type: 'FooterColumns',
        props: {
          id: 'footer-cols-main',
          width: 'boxed',
          background: 'inverted',
          paddingY: 'md',
          columns: 3,
          gap: 'lg',
        },
      },
      {
        type: 'FooterColumns',
        props: {
          id: 'footer-cols-bottom',
          width: 'boxed',
          background: 'inverted',
          paddingY: 'sm',
          columns: 1,
          gap: 'sm',
        },
      },
    ],
    zones: {
      'footer-cols-top:col1': [
        {
          type: 'Newsletter',
          props: {
            id: 'footer-newsletter',
            title: 'Stay informed with our weekly bulletin',
            description: 'Insights, product updates, and articles delivered to your inbox.',
            buttonText: 'Subscribe',
          },
        },
      ],
      'footer-cols-main:col1': [
        {
          type: 'Logo',
          props: {
            id: 'footer-logo',
            source: 'site',
            width: 140,
            link: '/',
            showSiteName: true,
          },
        },
        {
          type: 'ContactInfo',
          props: {
            id: 'footer-contact',
            layout: 'vertical',
            showIcons: true,
            items: [
              { kind: 'email', value: 'support@example.com', label: 'Support' },
              { kind: 'phone', value: '+1 (555) 392-1029', label: 'Sales' },
              { kind: 'address', value: '100 Market St, San Francisco, CA' },
            ],
          },
        },
      ],
      'footer-cols-main:col2': [
        {
          type: 'FooterLinks',
          props: {
            id: 'footer-links-quick',
            heading: 'Quick Navigation',
            source: 'manual',
            links: [
              { label: 'Home', url: '/' },
              { label: 'Features', url: '/#features' },
              { label: 'Pricing', url: '/pricing' },
              { label: 'Blog', url: '/blog' },
              { label: 'Contact', url: '/contact' },
            ],
          },
        },
      ],
      'footer-cols-main:col3': [
        {
          type: 'SocialIcons',
          props: {
            id: 'footer-social',
            shape: 'square',
            size: 'md',
            items: [
              { network: 'x', url: 'https://x.com', label: 'X' },
              { network: 'github', url: 'https://github.com', label: 'GitHub' },
              { network: 'linkedin', url: 'https://linkedin.com', label: 'LinkedIn' },
              { network: 'discord', url: 'https://discord.com', label: 'Discord' },
            ],
          },
        },
      ],
      'footer-cols-bottom:col1': [
        {
          type: 'Copyright',
          props: {
            id: 'footer-copyright',
            text: '© {year} {site_name}. All rights reserved.',
            align: 'center',
          },
        },
        {
          type: 'LegalLinks',
          props: {
            id: 'footer-legal',
            source: 'manual',
            separator: 'dot',
            align: 'center',
            links: [
              { label: 'Privacy Policy', url: '/privacy' },
              { label: 'Terms of Service', url: '/terms' },
            ],
          },
        },
        {
          type: 'BackToTop',
          props: {
            id: 'footer-back-to-top',
            position: 'bottom-right',
            showAfter: 300,
            icon: 'arrow',
          },
        },
      ],
    },
  },
};

export const HEADER_STARTERS: StarterTemplate[] = [
  HEADER_STARTER_CLASSIC,
  HEADER_STARTER_CENTERED,
  HEADER_STARTER_MINIMAL,
  HEADER_STARTER_WITH_TOPBAR,
];

export const FOOTER_STARTERS: StarterTemplate[] = [
  FOOTER_STARTER_COLUMNS_4,
  FOOTER_STARTER_CENTERED,
  FOOTER_STARTER_DARK_NEWSLETTER,
];

export function getStarterContent(
  category: 'Header' | 'Footer',
  key?: string
): BuilderData | null {
  if (!key || key === 'blank') return null;
  const list = category === 'Header' ? HEADER_STARTERS : FOOTER_STARTERS;
  const found = list.find(s => s.key === key);
  return found ? JSON.parse(JSON.stringify(found.content)) : null;
}
