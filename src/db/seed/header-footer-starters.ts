import type { BuilderData, BuilderItem } from '@/builder/data';

/** Global-block categories managed on the Site templates screen. */
export type SiteTemplateCategory =
  | 'Header'
  | 'Footer'
  | 'Search'
  | 'Archive'
  | 'MegaMenu';

export const SITE_TEMPLATE_CATEGORIES: readonly SiteTemplateCategory[] = [
  'Header',
  'Footer',
  'Search',
  'Archive',
  'MegaMenu',
];

export type StarterTemplate = {
  key: string;
  name: string;
  description: string;
  category: SiteTemplateCategory;
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

/* =========================================================================
   Search Results Starters (QRY-16)
   ========================================================================= */

export const SEARCH_STARTER_SIMPLE: StarterTemplate = {
  key: 'simple',
  name: 'Simple Search',
  description: 'Search box, result type tabs, thumbnails, and highlighted snippets.',
  category: 'Search',
  content: {
    root: { props: {} },
    content: [
      {
        type: 'SearchResults',
        props: {
          id: 'search-results-main',
          title: 'Search',
          showTabs: true,
          showThumbnails: true,
          showTypeBadges: true,
          showSnippets: true,
          pageSize: 20,
        },
      },
    ],
    zones: {},
  },
};

export const SEARCH_STARTER_COMPACT: StarterTemplate = {
  key: 'compact',
  name: 'Compact Search',
  description: 'Text-only results without thumbnails, ten per page.',
  category: 'Search',
  content: {
    root: { props: {} },
    content: [
      {
        type: 'SearchResults',
        props: {
          id: 'search-results-main',
          title: 'Search results',
          showTabs: false,
          showThumbnails: false,
          showTypeBadges: true,
          showSnippets: true,
          pageSize: 10,
        },
      },
    ],
    zones: {},
  },
};

/* =========================================================================
   Archive Starters (QRY-25). The Query Loop binds to the current
   category, tag, author, or date automatically on archive routes.
   ========================================================================= */

export const ARCHIVE_STARTER_GRID: StarterTemplate = {
  key: 'grid',
  name: 'Archive Grid',
  description: 'Archive title with a three-column post grid and numbered pages.',
  category: 'Archive',
  content: {
    root: { props: {} },
    content: [
      {
        type: 'QueryLoop',
        props: {
          id: 'archive-loop',
          loopId: '',
          source: 'posts',
          title: '{archive_title}',
          subtitle: '{archive_description}',
          layout: 'grid',
          columnsDesktop: 3,
          pageSize: 9,
          sortField: 'publishedAt',
          sortOrder: 'desc',
          pagination: 'numbered',
          emptyText: 'No posts in this archive yet.',
        },
      },
    ],
    zones: {},
  },
};

export const ARCHIVE_STARTER_LIST_FILTERS: StarterTemplate = {
  key: 'list-filters',
  name: 'List with Filters',
  description: 'Keyword, tag, and sort filters above a post list.',
  category: 'Archive',
  content: {
    root: { props: {} },
    content: [
      {
        type: 'QueryFilter',
        props: {
          id: 'archive-filter',
          targetLoopId: '',
          showKeyword: true,
          showCategories: false,
          showTags: true,
          showSort: true,
          showResultCount: true,
          showActiveChips: true,
        },
      },
      {
        type: 'QueryLoop',
        props: {
          id: 'archive-loop',
          loopId: '',
          source: 'posts',
          title: '{archive_title}',
          layout: 'list',
          pageSize: 10,
          sortField: 'publishedAt',
          sortOrder: 'desc',
          pagination: 'numbered',
          emptyText: 'No posts match these filters.',
        },
      },
    ],
    zones: {},
  },
};

/* =========================================================================
   Additional starter variants
   ========================================================================= */

const MOBILE_MENU = (id = 'header-mobile') => ({
  type: 'MobileMenu',
  props: { id, breakpoint: 'mobile', drawerSide: 'right', icon: 'menu' },
});

export const HEADER_STARTER_SPLIT_NAV: StarterTemplate = {
  key: 'split-nav',
  name: 'Split Navigation Header',
  description: 'Navigation on the left, centered logo, search and call-to-action on the right.',
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
          id: 'header-bar-split',
          width: 'boxed',
          background: 'default',
          paddingY: 'sm',
          align: 'center',
          borderBottom: true,
        },
      },
    ],
    zones: {
      'header-bar-split:left': [
        {
          type: 'NavMenu',
          props: {
            id: 'header-nav',
            location: 'header',
            orientation: 'horizontal',
            activeStyle: 'subtle',
          },
        },
        MOBILE_MENU(),
      ],
      'header-bar-split:center': [
        {
          type: 'Logo',
          props: { id: 'header-logo', source: 'site', width: 140, link: '/', showSiteName: true },
        },
      ],
      'header-bar-split:right': [
        {
          type: 'SearchBox',
          props: { id: 'header-search', mode: 'icon-modal', placeholder: 'Search site...' },
        },
        {
          type: 'Button',
          props: { id: 'header-cta', text: 'Contact us', link: '/contact', variant: 'primary', size: 'sm' },
        },
      ],
    },
  },
};

export const HEADER_STARTER_TRANSPARENT: StarterTemplate = {
  key: 'transparent-overlay',
  name: 'Transparent Overlay Header',
  description: 'Sits over the hero, turns solid and shrinks as visitors scroll. Great for landing pages.',
  category: 'Header',
  content: {
    root: {
      props: {
        sticky: 'always',
        transparent: true,
        shrinkOnScroll: true,
        hideOnScrollDown: false,
        shadow: 'on-scroll',
        zIndex: 50,
      },
    },
    content: [
      {
        type: 'HeaderBar',
        props: {
          id: 'header-bar-overlay',
          width: 'full',
          background: 'default',
          paddingY: 'md',
          align: 'center',
          borderBottom: false,
        },
      },
    ],
    zones: {
      'header-bar-overlay:left': [
        {
          type: 'Logo',
          props: { id: 'header-logo', source: 'site', width: 150, link: '/', showSiteName: true },
        },
      ],
      'header-bar-overlay:center': [
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
      'header-bar-overlay:right': [
        {
          type: 'Button',
          props: { id: 'header-cta', text: 'Get Started', link: '/contact', variant: 'primary', size: 'sm' },
        },
        MOBILE_MENU(),
      ],
    },
  },
};

export const HEADER_STARTER_LOGO_CTA: StarterTemplate = {
  key: 'logo-cta',
  name: 'Logo + Call to Action',
  description: 'Distraction-free bar with just the logo and one action button; the menu lives in a drawer on smaller screens.',
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
          id: 'header-bar-cta',
          width: 'boxed',
          background: 'default',
          paddingY: 'sm',
          align: 'center',
          borderBottom: false,
        },
      },
    ],
    zones: {
      'header-bar-cta:left': [
        {
          type: 'Logo',
          props: { id: 'header-logo', source: 'site', width: 130, link: '/', showSiteName: true },
        },
      ],
      'header-bar-cta:right': [
        {
          type: 'Button',
          props: { id: 'header-cta', text: 'Sign up free', link: '/contact', variant: 'primary', size: 'sm' },
        },
        { type: 'MobileMenu', props: { id: 'header-mobile', breakpoint: 'tablet', drawerSide: 'right', icon: 'menu' } },
      ],
    },
  },
};

export const FOOTER_STARTER_MINIMAL_LINE: StarterTemplate = {
  key: 'minimal-line',
  name: 'Minimal One-line Footer',
  description: 'A single slim row with copyright on one side and legal links on the other.',
  category: 'Footer',
  content: {
    root: { props: { background: 'default' } },
    content: [
      {
        type: 'FooterColumns',
        props: {
          id: 'footer-cols-line',
          width: 'boxed',
          background: 'default',
          paddingY: 'sm',
          columns: 2,
          gap: 'md',
        },
      },
    ],
    zones: {
      'footer-cols-line:col1': [
        {
          type: 'Copyright',
          props: { id: 'footer-copyright', text: '© {year} {site_name}', align: 'left' },
        },
      ],
      'footer-cols-line:col2': [
        {
          type: 'LegalLinks',
          props: {
            id: 'footer-legal',
            source: 'manual',
            separator: 'dot',
            align: 'right',
            links: [
              { label: 'Privacy', url: '/privacy' },
              { label: 'Terms', url: '/terms' },
              { label: 'Contact', url: '/contact' },
            ],
          },
        },
      ],
    },
  },
};

export const FOOTER_STARTER_BRAND_TWO_COL: StarterTemplate = {
  key: 'brand-two-column',
  name: 'Two-column Brand Footer',
  description: 'Logo and short about text beside a footer menu, with a muted copyright bar.',
  category: 'Footer',
  content: {
    root: { props: { background: 'default' } },
    content: [
      {
        type: 'FooterColumns',
        props: {
          id: 'footer-cols-brand',
          width: 'boxed',
          background: 'default',
          paddingY: 'lg',
          columns: 2,
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
      'footer-cols-brand:col1': [
        {
          type: 'Logo',
          props: { id: 'footer-logo', source: 'site', width: 140, link: '/', showSiteName: true },
        },
        {
          type: 'RichText',
          props: {
            id: 'footer-about',
            content:
              '<p class="text-sm text-steel-500 dark:text-steel-400 mt-2">We help teams publish faster with a modern, flexible content platform.</p>',
          },
        },
      ],
      'footer-cols-brand:col2': [
        {
          type: 'FooterLinks',
          props: {
            id: 'footer-links-explore',
            heading: 'Explore',
            source: 'manual',
            links: [
              { label: 'Home', url: '/' },
              { label: 'Blog', url: '/blog' },
              { label: 'About', url: '/about' },
              { label: 'Contact', url: '/contact' },
            ],
          },
        },
      ],
      'footer-cols-bottom:col1': [
        {
          type: 'Copyright',
          props: { id: 'footer-copyright', text: '© {year} {site_name}. All rights reserved.', align: 'center' },
        },
      ],
    },
  },
};

export const FOOTER_STARTER_SOCIAL: StarterTemplate = {
  key: 'social-focused',
  name: 'Social-focused Footer',
  description: 'Centered brand mark with large social icons, contact details, and copyright.',
  category: 'Footer',
  content: {
    root: { props: { background: 'muted' } },
    content: [
      {
        type: 'FooterColumns',
        props: {
          id: 'footer-cols-social',
          width: 'boxed',
          background: 'muted',
          paddingY: 'lg',
          columns: 1,
          gap: 'md',
        },
      },
    ],
    zones: {
      'footer-cols-social:col1': [
        {
          type: 'Logo',
          props: { id: 'footer-logo', source: 'site', width: 120, link: '/', showSiteName: false },
        },
        {
          type: 'SocialIcons',
          props: {
            id: 'footer-social',
            shape: 'round',
            size: 'lg',
            align: 'center',
            items: [
              { network: 'x', url: 'https://x.com', label: 'X' },
              { network: 'instagram', url: 'https://instagram.com', label: 'Instagram' },
              { network: 'youtube', url: 'https://youtube.com', label: 'YouTube' },
              { network: 'linkedin', url: 'https://linkedin.com', label: 'LinkedIn' },
              { network: 'github', url: 'https://github.com', label: 'GitHub' },
            ],
          },
        },
        {
          type: 'ContactInfo',
          props: {
            id: 'footer-contact',
            layout: 'horizontal',
            showIcons: true,
            items: [{ kind: 'email', value: 'hello@example.com', label: 'Email' }],
          },
        },
        {
          type: 'Copyright',
          props: { id: 'footer-copyright', text: '© {year} {site_name}', align: 'center' },
        },
      ],
    },
  },
};

export const SEARCH_STARTER_VISUAL: StarterTemplate = {
  key: 'visual',
  name: 'Visual Search',
  description: 'Large heading, type tabs, and big thumbnails, twelve results per page.',
  category: 'Search',
  content: {
    root: { props: {} },
    content: [
      {
        type: 'SearchResults',
        props: {
          id: 'search-results-main',
          eyebrow: 'Search',
          title: 'Find anything',
          subtitle: 'Pages, posts, and videos across the site.',
          showTabs: true,
          showThumbnails: true,
          showTypeBadges: false,
          showSnippets: false,
          pageSize: 12,
        },
      },
    ],
    zones: {},
  },
};

export const SEARCH_STARTER_DETAILED: StarterTemplate = {
  key: 'detailed',
  name: 'Detailed Results',
  description: 'Snippets, badges, and thumbnails with a friendly empty state, fifty per page.',
  category: 'Search',
  content: {
    root: { props: {} },
    content: [
      {
        type: 'SearchResults',
        props: {
          id: 'search-results-main',
          title: 'Search results',
          subtitle: 'Refine your search or browse by type.',
          showTabs: true,
          showThumbnails: true,
          showTypeBadges: true,
          showSnippets: true,
          pageSize: 50,
          emptyText: 'Nothing matched. Try fewer or different keywords.',
        },
      },
    ],
    zones: {},
  },
};

export const ARCHIVE_STARTER_MAGAZINE: StarterTemplate = {
  key: 'magazine',
  name: 'Magazine Archive',
  description: 'Two-column large cards with images, excerpts, and a load-more button.',
  category: 'Archive',
  content: {
    root: { props: {} },
    content: [
      {
        type: 'QueryLoop',
        props: {
          id: 'archive-loop',
          loopId: '',
          source: 'posts',
          eyebrow: 'Archive',
          title: '{archive_title}',
          subtitle: '{archive_description}',
          layout: 'grid',
          columnsDesktop: 2,
          columnsTablet: 2,
          columnsMobile: 1,
          gap: 'lg',
          pageSize: 8,
          sortField: 'publishedAt',
          sortOrder: 'desc',
          pagination: 'load-more',
          loadMoreLabel: 'Load more stories',
          showImage: true,
          showExcerpt: true,
          showAuthor: true,
          showDate: true,
          showTerms: true,
          emptyText: 'No stories here yet.',
        },
      },
    ],
    zones: {},
  },
};

export const ARCHIVE_STARTER_MASONRY_FILTERS: StarterTemplate = {
  key: 'masonry-filters',
  name: 'Masonry with Filters',
  description: 'Category, tag, and sort filters above a masonry wall that scrolls infinitely.',
  category: 'Archive',
  content: {
    root: { props: {} },
    content: [
      {
        type: 'QueryFilter',
        props: {
          id: 'archive-filter',
          targetLoopId: '',
          showKeyword: true,
          showCategories: true,
          showTags: true,
          showSort: true,
          showResultCount: true,
          showActiveChips: true,
        },
      },
      {
        type: 'QueryLoop',
        props: {
          id: 'archive-loop',
          loopId: '',
          source: 'posts',
          title: '{archive_title}',
          layout: 'masonry',
          columnsDesktop: 3,
          pageSize: 12,
          sortField: 'publishedAt',
          sortOrder: 'desc',
          pagination: 'infinite-scroll',
          emptyText: 'No posts match these filters.',
        },
      },
    ],
    zones: {},
  },
};

export const ARCHIVE_STARTER_MINIMAL_LIST: StarterTemplate = {
  key: 'minimal-list',
  name: 'Minimal List',
  description: 'Text-only list of titles and dates, twenty per page. Ideal for date and author archives.',
  category: 'Archive',
  content: {
    root: { props: {} },
    content: [
      {
        type: 'QueryLoop',
        props: {
          id: 'archive-loop',
          loopId: '',
          source: 'posts',
          title: '{archive_title}',
          layout: 'list',
          gap: 'sm',
          pageSize: 20,
          sortField: 'publishedAt',
          sortOrder: 'desc',
          pagination: 'numbered',
          showImage: false,
          showExcerpt: false,
          showAuthor: false,
          showDate: true,
          showTerms: false,
          emptyText: 'No posts in this archive yet.',
        },
      },
    ],
    zones: {},
  },
};

/* =========================================================================
   Mega menu starters. Attach one to a top-level item on the Menus screen.
   ========================================================================= */

const MEGA_ROOT = {
  props: { background: 'default', padding: 'md', radius: 'md', shadow: 'md', maxHeight: 0, previewWidth: 'container' },
};
const NO_PAD = { paddingY: 'none', background: 'default' };

const linkList = (id: string, heading: string, links: [string, string][]) => ({
  type: 'FooterLinks',
  props: {
    id,
    heading,
    source: 'manual',
    links: links.map(([label, url]) => ({ label, url })),
    section: NO_PAD,
  },
});

export const MEGA_STARTER_COLUMNS: StarterTemplate = {
  key: 'link-columns',
  name: 'Link Columns',
  description: 'Four columns of headed link lists. The classic mega menu.',
  category: 'MegaMenu',
  content: {
    root: MEGA_ROOT,
    content: [
      {
        type: 'Columns',
        props: { id: 'mega-cols', layout: '1-1-1-1', gap: 'md', verticalAlign: 'start', section: NO_PAD },
      },
    ],
    zones: {
      'mega-cols:column1': [
        linkList('mega-links-1', 'Products', [
          ['Overview', '/products'],
          ['Features', '/#features'],
          ['Pricing', '/pricing'],
          ['Changelog', '/blog'],
        ]),
      ],
      'mega-cols:column2': [
        linkList('mega-links-2', 'Solutions', [
          ['For startups', '/solutions/startups'],
          ['For agencies', '/solutions/agencies'],
          ['For enterprise', '/solutions/enterprise'],
        ]),
      ],
      'mega-cols:column3': [
        linkList('mega-links-3', 'Resources', [
          ['Blog', '/blog'],
          ['Guides', '/guides'],
          ['Help center', '/help'],
        ]),
      ],
      'mega-cols:column4': [
        linkList('mega-links-4', 'Company', [
          ['About', '/about'],
          ['Careers', '/careers'],
          ['Contact', '/contact'],
        ]),
      ],
    },
  },
};

export const MEGA_STARTER_FEATURED: StarterTemplate = {
  key: 'links-featured',
  name: 'Links + Featured Card',
  description: 'Three link columns with a featured promo card on the right.',
  category: 'MegaMenu',
  content: {
    root: MEGA_ROOT,
    content: [
      {
        type: 'Columns',
        props: { id: 'mega-cols', layout: '1-1-1-1', gap: 'lg', verticalAlign: 'start', section: NO_PAD },
      },
    ],
    zones: {
      'mega-cols:column1': [
        linkList('mega-links-1', 'Platform', [
          ['Visual builder', '/features/builder'],
          ['Content API', '/features/api'],
          ['Media library', '/features/media'],
        ]),
      ],
      'mega-cols:column2': [
        linkList('mega-links-2', 'Use cases', [
          ['Marketing sites', '/use-cases/marketing'],
          ['Blogs', '/use-cases/blogs'],
          ['Docs', '/use-cases/docs'],
        ]),
      ],
      'mega-cols:column3': [
        linkList('mega-links-3', 'Learn', [
          ['Blog', '/blog'],
          ['Tutorials', '/tutorials'],
          ['Community', '/community'],
        ]),
      ],
      'mega-cols:column4': [
        {
          type: 'MegaMenuCard',
          props: {
            id: 'mega-card',
            layout: 'stacked',
            eyebrow: 'New',
            title: 'See what shipped this month',
            text: 'Faster editing, new blocks, and more.',
            linkLabel: 'Read the update',
            link: '/blog',
            section: NO_PAD,
          },
        },
      ],
    },
  },
};

export const MEGA_STARTER_VISUAL: StarterTemplate = {
  key: 'visual-grid',
  name: 'Visual Grid',
  description: 'Three image cards with titles. Great for categories or collections.',
  category: 'MegaMenu',
  content: {
    root: MEGA_ROOT,
    content: [
      {
        type: 'Columns',
        props: { id: 'mega-cols', layout: '1-1-1', gap: 'md', verticalAlign: 'start', section: NO_PAD },
      },
      {
        type: 'Button',
        props: { id: 'mega-all', label: 'Browse everything', link: '/blog', alignment: 'left', section: { paddingY: 'sm', background: 'default' } },
      },
    ],
    zones: Object.fromEntries(
      [
        ['Design', 'Layouts, color, and type.'],
        ['Development', 'Code, APIs, and tooling.'],
        ['Marketing', 'Growth, SEO, and content.'],
      ].map(([title, text], i) => [
        `mega-cols:column${i + 1}`,
        [
          {
            type: 'MegaMenuCard',
            props: {
              id: `mega-card-${i + 1}`,
              layout: 'overlay',
              title,
              text,
              linkLabel: 'Explore',
              link: `/blog/category/${title.toLowerCase()}`,
              section: NO_PAD,
            },
          },
        ],
      ])
    ),
  },
};

export const HEADER_STARTERS: StarterTemplate[] = [
  HEADER_STARTER_CLASSIC,
  HEADER_STARTER_CENTERED,
  HEADER_STARTER_MINIMAL,
  HEADER_STARTER_WITH_TOPBAR,
  HEADER_STARTER_SPLIT_NAV,
  HEADER_STARTER_TRANSPARENT,
  HEADER_STARTER_LOGO_CTA,
];

export const FOOTER_STARTERS: StarterTemplate[] = [
  FOOTER_STARTER_COLUMNS_4,
  FOOTER_STARTER_CENTERED,
  FOOTER_STARTER_DARK_NEWSLETTER,
  FOOTER_STARTER_MINIMAL_LINE,
  FOOTER_STARTER_BRAND_TWO_COL,
  FOOTER_STARTER_SOCIAL,
];

export const SEARCH_STARTERS: StarterTemplate[] = [
  SEARCH_STARTER_SIMPLE,
  SEARCH_STARTER_COMPACT,
  SEARCH_STARTER_VISUAL,
  SEARCH_STARTER_DETAILED,
];

export const ARCHIVE_STARTERS: StarterTemplate[] = [
  ARCHIVE_STARTER_GRID,
  ARCHIVE_STARTER_LIST_FILTERS,
  ARCHIVE_STARTER_MAGAZINE,
  ARCHIVE_STARTER_MASONRY_FILTERS,
  ARCHIVE_STARTER_MINIMAL_LIST,
];

export const MEGA_MENU_STARTERS: StarterTemplate[] = [
  MEGA_STARTER_COLUMNS,
  MEGA_STARTER_FEATURED,
  MEGA_STARTER_VISUAL,
];

export const STARTERS_BY_CATEGORY: Record<SiteTemplateCategory, StarterTemplate[]> = {
  Header: HEADER_STARTERS,
  Footer: FOOTER_STARTERS,
  Search: SEARCH_STARTERS,
  Archive: ARCHIVE_STARTERS,
  MegaMenu: MEGA_MENU_STARTERS,
};

export function getStarterContent(
  category: SiteTemplateCategory,
  key?: string
): BuilderData | null {
  if (!key || key === 'blank') return null;
  const found = STARTERS_BY_CATEGORY[category].find(s => s.key === key);
  return found ? JSON.parse(JSON.stringify(found.content)) : null;
}
