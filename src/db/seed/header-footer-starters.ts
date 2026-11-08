import type { BuilderData, BuilderItem } from '@/builder/data';
import { migratePuckColumns } from '@/builder/migrations/column-blocks';
import {
  DEFAULT_DRAWER_SETTINGS,
  DEFAULT_POPUP_SETTINGS,
} from '@/lib/overlays/types';

/** Global-block categories managed on the Site templates screen. */
export type SiteTemplateCategory =
  'Header' | 'Footer' | 'Search' | 'Archive' | 'MegaMenu' | 'Popup' | 'Drawer';

export const SITE_TEMPLATE_CATEGORIES: readonly SiteTemplateCategory[] = [
  'Header',
  'Footer',
  'Search',
  'Archive',
  'MegaMenu',
  'Popup',
  'Drawer',
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
  description:
    'Logo left, navigation links center, search & call-to-action button right.',
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
            label: 'Get Started',
            link: '/contact',
            variant: 'primary',
            size: 'sm',
            section: { paddingY: 'none' },
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
  description:
    'Social links left, prominent centered brand logo, search right, navigation below.',
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
              {
                network: 'linkedin',
                url: 'https://linkedin.com',
                label: 'LinkedIn',
              },
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
  description:
    'Top announcement & contact bar with main navigation and action button.',
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
              {
                network: 'linkedin',
                url: 'https://linkedin.com',
                label: 'LinkedIn',
              },
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
            label: 'Book a demo',
            link: '/contact',
            variant: 'primary',
            size: 'sm',
            section: { paddingY: 'none' },
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
  description:
    'Rich footer with brand overview, product links, company links, newsletter, and legal bar.',
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
            description:
              'Get our latest updates and articles directly to your inbox.',
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
              {
                network: 'linkedin',
                url: 'https://linkedin.com',
                label: 'LinkedIn',
              },
              {
                network: 'youtube',
                url: 'https://youtube.com',
                label: 'YouTube',
              },
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
  description:
    'Minimalist centered footer with brand mark, social links, legal navigation, and copyright.',
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
              {
                network: 'linkedin',
                url: 'https://linkedin.com',
                label: 'LinkedIn',
              },
              {
                network: 'youtube',
                url: 'https://youtube.com',
                label: 'YouTube',
              },
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
  description:
    'High-contrast inverted footer featuring newsletter subscription, contact info, and back-to-top button.',
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
            description:
              'Insights, product updates, and articles delivered to your inbox.',
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
              {
                network: 'linkedin',
                url: 'https://linkedin.com',
                label: 'LinkedIn',
              },
              {
                network: 'discord',
                url: 'https://discord.com',
                label: 'Discord',
              },
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
  description:
    'Search box, result type tabs, thumbnails, and highlighted snippets.',
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
  description:
    'Archive title with a three-column post grid and numbered pages.',
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
  description:
    'Navigation on the left, centered logo, search and call-to-action on the right.',
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
          props: {
            id: 'header-logo',
            source: 'site',
            width: 140,
            link: '/',
            showSiteName: true,
          },
        },
      ],
      'header-bar-split:right': [
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
            label: 'Contact us',
            link: '/contact',
            variant: 'primary',
            size: 'sm',
            section: { paddingY: 'none' },
          },
        },
      ],
    },
  },
};

export const HEADER_STARTER_TRANSPARENT: StarterTemplate = {
  key: 'transparent-overlay',
  name: 'Transparent Overlay Header',
  description:
    'Sits over the hero, turns solid and shrinks as visitors scroll. Great for landing pages.',
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
          props: {
            id: 'header-logo',
            source: 'site',
            width: 150,
            link: '/',
            showSiteName: true,
          },
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
          props: {
            id: 'header-cta',
            label: 'Get Started',
            link: '/contact',
            variant: 'primary',
            size: 'sm',
            section: { paddingY: 'none' },
          },
        },
        MOBILE_MENU(),
      ],
    },
  },
};

export const HEADER_STARTER_LOGO_CTA: StarterTemplate = {
  key: 'logo-cta',
  name: 'Logo + Call to Action',
  description:
    'Distraction-free bar with just the logo and one action button; the menu lives in a drawer on smaller screens.',
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
          props: {
            id: 'header-logo',
            source: 'site',
            width: 130,
            link: '/',
            showSiteName: true,
          },
        },
      ],
      'header-bar-cta:right': [
        {
          type: 'Button',
          props: {
            id: 'header-cta',
            label: 'Sign up free',
            link: '/contact',
            variant: 'primary',
            size: 'sm',
            section: { paddingY: 'none' },
          },
        },
        {
          type: 'MobileMenu',
          props: {
            id: 'header-mobile',
            breakpoint: 'tablet',
            drawerSide: 'right',
            icon: 'menu',
          },
        },
      ],
    },
  },
};

export const FOOTER_STARTER_MINIMAL_LINE: StarterTemplate = {
  key: 'minimal-line',
  name: 'Minimal One-line Footer',
  description:
    'A single slim row with copyright on one side and legal links on the other.',
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
          props: {
            id: 'footer-copyright',
            text: '© {year} {site_name}',
            align: 'left',
          },
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
  description:
    'Logo and short about text beside a footer menu, with a muted copyright bar.',
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
          props: {
            id: 'footer-logo',
            source: 'site',
            width: 140,
            link: '/',
            showSiteName: true,
          },
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

export const FOOTER_STARTER_SOCIAL: StarterTemplate = {
  key: 'social-focused',
  name: 'Social-focused Footer',
  description:
    'Centered brand mark with large social icons, contact details, and copyright.',
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
          props: {
            id: 'footer-logo',
            source: 'site',
            width: 120,
            link: '/',
            showSiteName: false,
          },
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
              {
                network: 'instagram',
                url: 'https://instagram.com',
                label: 'Instagram',
              },
              {
                network: 'youtube',
                url: 'https://youtube.com',
                label: 'YouTube',
              },
              {
                network: 'linkedin',
                url: 'https://linkedin.com',
                label: 'LinkedIn',
              },
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
            items: [
              { kind: 'email', value: 'hello@example.com', label: 'Email' },
            ],
          },
        },
        {
          type: 'Copyright',
          props: {
            id: 'footer-copyright',
            text: '© {year} {site_name}',
            align: 'center',
          },
        },
      ],
    },
  },
};

export const SEARCH_STARTER_VISUAL: StarterTemplate = {
  key: 'visual',
  name: 'Visual Search',
  description:
    'Large heading, type tabs, and big thumbnails, twelve results per page.',
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
  description:
    'Snippets, badges, and thumbnails with a friendly empty state, fifty per page.',
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
  description:
    'Two-column large cards with images, excerpts, and a load-more button.',
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
  description:
    'Category, tag, and sort filters above a masonry wall that scrolls infinitely.',
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
  description:
    'Text-only list of titles and dates, twenty per page. Ideal for date and author archives.',
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
  props: {
    background: 'default',
    padding: 'md',
    radius: 'md',
    shadow: 'md',
    maxHeight: 0,
    previewWidth: 'container',
  },
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
        props: {
          id: 'mega-cols',
          layout: '1-1-1-1',
          gap: 'md',
          verticalAlign: 'start',
          section: NO_PAD,
        },
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
        props: {
          id: 'mega-cols',
          layout: '1-1-1-1',
          gap: 'lg',
          verticalAlign: 'start',
          section: NO_PAD,
        },
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
  description:
    'Three image cards with titles. Great for categories or collections.',
  category: 'MegaMenu',
  content: {
    root: MEGA_ROOT,
    content: [
      {
        type: 'Columns',
        props: {
          id: 'mega-cols',
          layout: '1-1-1',
          gap: 'md',
          verticalAlign: 'start',
          section: NO_PAD,
        },
      },
      {
        type: 'Button',
        props: {
          id: 'mega-all',
          label: 'Browse everything',
          link: '/blog',
          alignment: 'left',
          section: { paddingY: 'sm', background: 'default' },
        },
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

/* =========================================================================
   "Quiet Editorial" starters — pair with the Quiet Editorial theme preset
   (Settings → Theme). Glass sticky header, serif wordmark, hairline rules.
   ========================================================================= */

export const HEADER_STARTER_EDITORIAL: StarterTemplate = {
  key: 'quiet-editorial',
  name: 'Quiet Editorial Header',
  description:
    'Announcement line, serif wordmark with tagline, pill navigation, search, saved items, theme switch, and a subscribe button. Glass when scrolled.',
  category: 'Header',
  content: {
    root: {
      props: {
        sticky: 'always',
        transparent: false,
        shrinkOnScroll: true,
        hideOnScrollDown: false,
        shadow: 'none',
        zIndex: 50,
        style: {
          fill: { type: 'color', color: 'var(--site-glass-bg)' },
          backdropBlur: 14,
        },
      },
    },
    content: [
      {
        type: 'AnnouncementBar',
        props: {
          id: 'qe-announcement',
          text: 'New dispatch: notes on material, light and silence →',
          link: '/blog',
          dismissible: true,
          dismissDays: 14,
        },
      },
      {
        type: 'HeaderBar',
        props: {
          id: 'qe-header-bar',
          width: 'boxed',
          layout: 'custom',
          leftWidth: 'auto',
          leftAlign: 'start',
          centerWidth: 'fill',
          centerAlign: 'center',
          rightWidth: 'auto',
          rightAlign: 'end',
          stackOn: 'none',
          background: 'transparent',
          paddingY: 'sm',
          align: 'center',
          borderBottom: true,
        },
      },
    ],
    zones: {
      'qe-header-bar:left': [
        {
          type: 'Logo',
          props: {
            id: 'qe-logo',
            source: 'site',
            width: 36,
            link: '/',
            showSiteName: true,
            tagline: 'The Editorial Review',
          },
        },
      ],
      'qe-header-bar:center': [
        {
          type: 'NavMenu',
          props: {
            id: 'qe-nav',
            location: 'header',
            orientation: 'horizontal',
            activeStyle: 'pill',
            gap: 'sm',
          },
        },
      ],
      'qe-header-bar:right': [
        {
          type: 'SearchBox',
          props: {
            id: 'qe-search',
            mode: 'icon-modal',
            placeholder: 'Search dispatches…',
            liveResults: true,
          },
        },
        { type: 'Bookmarks', props: { id: 'qe-bookmarks', title: 'Saved' } },
        { type: 'ThemeToggle', props: { id: 'qe-theme' } },
        {
          type: 'Button',
          props: {
            id: 'qe-cta',
            label: 'Subscribe',
            link: '/#subscribe',
            variant: 'primary',
            size: 'sm',
            section: { paddingY: 'none' },
          },
        },
        {
          type: 'MobileMenu',
          props: {
            id: 'qe-mobile',
            breakpoint: 'mobile',
            drawerSide: 'right',
            icon: 'menu',
            showSearch: true,
          },
        },
      ],
    },
  },
};

export const FOOTER_STARTER_EDITORIAL: StarterTemplate = {
  key: 'quiet-editorial',
  name: 'Quiet Editorial Footer',
  description:
    'Brand column, two link columns, a compact newsletter, then copyright and legal links on a hairline rule.',
  category: 'Footer',
  content: {
    root: { props: { background: 'muted' } },
    content: [
      {
        type: 'FooterColumns',
        props: {
          id: 'qe-footer-main',
          width: 'boxed',
          background: 'default',
          paddingY: 'lg',
          columns: 4,
          gap: 'lg',
          stackOn: 'tablet',
        },
      },
      {
        type: 'FooterColumns',
        props: {
          id: 'qe-footer-bottom',
          width: 'boxed',
          background: 'default',
          paddingY: 'sm',
          columns: 2,
          gap: 'sm',
        },
      },
    ],
    zones: {
      'qe-footer-main:col1': [
        {
          type: 'Logo',
          props: {
            id: 'qe-footer-logo',
            source: 'site',
            width: 32,
            link: '/',
            showSiteName: true,
            tagline: 'The Editorial Review',
          },
        },
        {
          type: 'RichText',
          props: {
            id: 'qe-footer-about',
            width: 'normal',
            content:
              '<p>Essays on material culture, architecture and the quiet spaces between.</p>',
            section: { paddingY: 'none' },
          },
        },
        {
          type: 'SocialIcons',
          props: {
            id: 'qe-footer-social',
            shape: 'round',
            size: 'sm',
            align: 'left',
            items: [
              {
                network: 'instagram',
                url: 'https://instagram.com',
                label: 'Instagram',
              },
              { network: 'x', url: 'https://x.com', label: 'X' },
              {
                network: 'linkedin',
                url: 'https://linkedin.com',
                label: 'LinkedIn',
              },
            ],
          },
        },
      ],
      'qe-footer-main:col2': [
        {
          type: 'FooterLinks',
          props: {
            id: 'qe-footer-read',
            heading: 'Read',
            source: 'manual',
            collapseOnMobile: true,
            links: [
              { label: 'Latest dispatches', url: '/blog' },
              { label: 'Curated archive', url: '/blog' },
              { label: 'Search', url: '/search' },
            ],
          },
        },
      ],
      'qe-footer-main:col3': [
        {
          type: 'FooterLinks',
          props: {
            id: 'qe-footer-about-links',
            heading: 'About',
            source: 'manual',
            collapseOnMobile: true,
            links: [
              { label: 'Our ethos', url: '/about' },
              { label: 'Contributors', url: '/about' },
              { label: 'Contact', url: '/contact' },
            ],
          },
        },
      ],
      'qe-footer-main:col4': [
        {
          type: 'Newsletter',
          props: {
            id: 'qe-footer-newsletter',
            title: 'The monthly dispatch',
            text: 'One considered letter a month. No noise.',
            placeholder: 'you@example.com',
            submitText: 'Subscribe',
            successMessage: 'Thank you — you are on the list.',
            layout: 'compact',
            section: { paddingY: 'none', anchor: 'subscribe' },
          },
        },
      ],
      'qe-footer-bottom:col1': [
        {
          type: 'Copyright',
          props: {
            id: 'qe-footer-copyright',
            text: '© {year} {site_name}. All rights reserved.',
            align: 'left',
          },
        },
      ],
      'qe-footer-bottom:col2': [
        {
          type: 'LegalLinks',
          props: {
            id: 'qe-footer-legal',
            source: 'manual',
            separator: 'dot',
            align: 'right',
            links: [
              { label: 'Privacy', url: '/privacy' },
              { label: 'Terms', url: '/terms' },
              { label: 'Colophon', url: '/about' },
            ],
          },
        },
      ],
    },
  },
};

export const ARCHIVE_STARTER_EDITORIAL: StarterTemplate = {
  key: 'quiet-editorial',
  name: 'Quiet Editorial Archive',
  description:
    'A featured lead post and an outline-card grid, with search and category chips in a left sidebar.',
  category: 'Archive',
  content: {
    root: { props: {} },
    content: [
      {
        type: 'QueryLoop',
        props: {
          id: 'qe-archive-loop',
          loopId: 'qe-archive',
          source: 'posts',
          eyebrow: 'Curated archive',
          title: '{archive_title}',
          subtitle: '{archive_description}',
          layout: 'featured',
          columnsDesktop: 2,
          columnsTablet: 2,
          columnsMobile: 1,
          gap: 'lg',
          pageSize: 9,
          filterPosition: 'left',
          filterSticky: true,
          filterShowKeyword: true,
          filterKeywordPlaceholder: 'Search the archive…',
          filterShowCategories: true,
          filterCategoryStyle: 'chips',
          filterShowTags: false,
          filterShowSort: true,
          filterShowResultCount: true,
          filterShowActiveChips: true,
          filterMobileDrawer: true,
          sortField: 'publishedAt',
          sortOrder: 'desc',
          pagination: 'numbered',
          cardVariant: 'outline',
          cardHover: true,
          emptyText: 'No dispatches in this archive yet.',
        },
      },
    ],
    zones: {},
  },
};

export const SEARCH_STARTER_EDITORIAL: StarterTemplate = {
  key: 'quiet-editorial',
  name: 'Quiet Editorial Search',
  description: 'Serif heading, type tabs, thumbnails and highlighted snippets.',
  category: 'Search',
  content: {
    root: { props: {} },
    content: [
      {
        type: 'SearchResults',
        props: {
          id: 'qe-search-results',
          eyebrow: 'Search',
          title: 'Find a dispatch',
          subtitle: 'Essays, registers and pages across the review.',
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

export const HEADER_STARTERS: StarterTemplate[] = [
  HEADER_STARTER_EDITORIAL,
  HEADER_STARTER_CLASSIC,
  HEADER_STARTER_CENTERED,
  HEADER_STARTER_MINIMAL,
  HEADER_STARTER_WITH_TOPBAR,
  HEADER_STARTER_SPLIT_NAV,
  HEADER_STARTER_TRANSPARENT,
  HEADER_STARTER_LOGO_CTA,
];

export const FOOTER_STARTERS: StarterTemplate[] = [
  FOOTER_STARTER_EDITORIAL,
  FOOTER_STARTER_COLUMNS_4,
  FOOTER_STARTER_CENTERED,
  FOOTER_STARTER_DARK_NEWSLETTER,
  FOOTER_STARTER_MINIMAL_LINE,
  FOOTER_STARTER_BRAND_TWO_COL,
  FOOTER_STARTER_SOCIAL,
];

export const SEARCH_STARTERS: StarterTemplate[] = [
  SEARCH_STARTER_EDITORIAL,
  SEARCH_STARTER_SIMPLE,
  SEARCH_STARTER_COMPACT,
  SEARCH_STARTER_VISUAL,
  SEARCH_STARTER_DETAILED,
];

export const ARCHIVE_STARTERS: StarterTemplate[] = [
  ARCHIVE_STARTER_EDITORIAL,
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

export const POPUP_STARTER_NEWSLETTER: StarterTemplate = {
  key: 'newsletter-popup',
  name: 'Newsletter Popup',
  description:
    'Centered modal with headline, subtitle, newsletter signup and close button.',
  category: 'Popup',
  content: {
    root: {
      props: {
        ...DEFAULT_POPUP_SETTINGS,
      },
    },
    content: [
      {
        type: 'Container',
        props: {
          section: { paddingY: 'none' },
          container: {
            mode: 'flex',
            tag: 'div',
            direction: { desktop: 'column' },
            wrap: { desktop: 'nowrap' },
            justify: { desktop: 'start' },
            alignItems: { desktop: 'stretch' },
            alignContent: { desktop: 'start' },
            gap: { desktop: 16 },
            boxSizing: 'border-box',
          },
          id: 'popup-container',
          width: 'full',
          paddingY: 'md',
        },
      },
    ],
    zones: {
      'popup-container:content': [
        {
          type: 'Heading',
          props: {
            section: { paddingY: 'none' },
            id: 'popup-heading',
            text: 'Join our weekly dispatch',
            level: 'h2',
            alignment: 'center',
          },
        },
        {
          type: 'RichText',
          props: {
            section: { paddingY: 'none' },
            id: 'popup-body',
            content:
              '<p style="text-align: center;">Get thoughtful perspectives, design notes and curated essays delivered to your inbox every Sunday.</p>',
          },
        },
        {
          type: 'Newsletter',
          props: {
            section: { paddingY: 'none' },
            id: 'popup-newsletter',
            title: '',
            buttonText: 'Subscribe',
          },
        },
        {
          type: 'OverlayClose',
          props: {
            section: { paddingY: 'none' },
            id: 'popup-dismiss',
            label: 'No thanks, maybe later',
            variant: 'link',
            alignment: 'center',
          },
        },
      ],
    },
  },
};

export const POPUP_STARTER_PROMO: StarterTemplate = {
  key: 'promo-popup',
  name: 'Promo & Discount Popup',
  description:
    'Special promo modal with announcement headline, call to action and dismiss button.',
  category: 'Popup',
  content: {
    root: {
      props: {
        ...DEFAULT_POPUP_SETTINGS,
        layout: {
          ...DEFAULT_POPUP_SETTINGS.layout,
          width: '520px',
        },
        trigger: {
          type: 'delay',
          delaySec: 5,
        },
      },
    },
    content: [
      {
        type: 'Container',
        props: {
          section: { paddingY: 'none' },
          container: {
            mode: 'flex',
            tag: 'div',
            direction: { desktop: 'column' },
            wrap: { desktop: 'nowrap' },
            justify: { desktop: 'start' },
            alignItems: { desktop: 'stretch' },
            alignContent: { desktop: 'start' },
            gap: { desktop: 16 },
            boxSizing: 'border-box',
          },
          id: 'promo-container',
          width: 'full',
          paddingY: 'md',
        },
      },
    ],
    zones: {
      'promo-container:content': [
        {
          type: 'Heading',
          props: {
            section: { paddingY: 'none' },
            id: 'promo-heading',
            text: 'Limited-Time: 20% Off All Plans',
            level: 'h2',
            alignment: 'center',
          },
        },
        {
          type: 'RichText',
          props: {
            section: { paddingY: 'none' },
            id: 'promo-body',
            content:
              '<p style="text-align: center;">Upgrade this week and lock in early-bird pricing for life. Use code <strong>LAUNCH20</strong> at checkout.</p>',
          },
        },
        {
          type: 'Button',
          props: {
            section: { paddingY: 'none' },
            id: 'promo-cta',
            label: 'Claim Your Discount',
            link: '/pricing',
            variant: 'primary',
            alignment: 'center',
          },
        },
        {
          type: 'OverlayClose',
          props: {
            section: { paddingY: 'none' },
            id: 'promo-close',
            label: 'Dismiss offer',
            variant: 'link',
            alignment: 'center',
          },
        },
      ],
    },
  },
};

export const DRAWER_STARTER_INFO: StarterTemplate = {
  key: 'info-drawer',
  name: 'Cart / Info Drawer',
  description:
    'Slide-in side drawer from right with overview details, links and actions.',
  category: 'Drawer',
  content: {
    root: {
      props: {
        ...DEFAULT_DRAWER_SETTINGS,
      },
    },
    content: [
      {
        type: 'Container',
        props: {
          section: { paddingY: 'none' },
          container: {
            mode: 'flex',
            tag: 'div',
            direction: { desktop: 'column' },
            wrap: { desktop: 'nowrap' },
            justify: { desktop: 'start' },
            alignItems: { desktop: 'stretch' },
            alignContent: { desktop: 'start' },
            gap: { desktop: 16 },
            boxSizing: 'border-box',
          },
          id: 'drawer-container',
          width: 'full',
          paddingY: 'md',
        },
      },
    ],
    zones: {
      'drawer-container:content': [
        {
          type: 'Heading',
          props: {
            section: { paddingY: 'none' },
            id: 'drawer-heading',
            text: 'Quick Overview',
            level: 'h3',
          },
        },
        {
          type: 'RichText',
          props: {
            section: { paddingY: 'none' },
            id: 'drawer-body',
            content:
              '<p>Explore resources, documentation guides and direct help channels.</p>',
          },
        },
        {
          type: 'Button',
          props: {
            section: { paddingY: 'none' },
            id: 'drawer-cta',
            label: 'Open Documentation',
            link: '/docs',
            variant: 'primary',
          },
        },
        {
          type: 'OverlayClose',
          props: {
            section: { paddingY: 'none' },
            id: 'drawer-close-btn',
            label: 'Close Drawer',
            variant: 'button',
            buttonStyle: 'outline',
          },
        },
      ],
    },
  },
};

export const DRAWER_STARTER_COOKIE: StarterTemplate = {
  key: 'cookie-bottom-drawer',
  name: 'Cookie & Notice Drawer',
  description:
    'Slide-in bottom drawer with consent information, accept action and preferences link.',
  category: 'Drawer',
  content: {
    root: {
      props: {
        ...DEFAULT_DRAWER_SETTINGS,
        layout: {
          ...DEFAULT_DRAWER_SETTINGS.layout,
          position: 'bottom',
          width: '100%',
          maxHeight: '40vh',
        },
        trigger: {
          type: 'load',
        },
        frequency: {
          mode: 'once-ever',
          stopAfterConversion: true,
        },
      },
    },
    content: [
      {
        type: 'Container',
        props: {
          section: { paddingY: 'none' },
          container: {
            mode: 'flex',
            tag: 'div',
            direction: { desktop: 'column' },
            wrap: { desktop: 'nowrap' },
            justify: { desktop: 'start' },
            alignItems: { desktop: 'stretch' },
            alignContent: { desktop: 'start' },
            gap: { desktop: 16 },
            boxSizing: 'border-box',
          },
          id: 'cookie-container',
          width: 'full',
          paddingY: 'sm',
        },
      },
    ],
    zones: {
      'cookie-container:content': [
        {
          type: 'Heading',
          props: {
            section: { paddingY: 'none' },
            id: 'cookie-heading',
            text: 'We value your privacy',
            level: 'h4',
          },
        },
        {
          type: 'RichText',
          props: {
            section: { paddingY: 'none' },
            id: 'cookie-body',
            content:
              '<p>We use essential cookies to make our site work and optional analytics to understand how you interact with our pages.</p>',
          },
        },
        {
          type: 'Columns',
          props: {
            section: { paddingY: 'none' },
            id: 'cookie-actions',
            columns: 2,
            gap: 'sm',
          },
        },
      ],
      'cookie-actions:column1': [
        {
          type: 'OverlayClose',
          props: {
            section: { paddingY: 'none' },
            id: 'cookie-accept',
            label: 'Accept all cookies',
            variant: 'button',
            buttonStyle: 'primary',
          },
        },
      ],
      'cookie-actions:column2': [
        {
          type: 'OverlayClose',
          props: {
            section: { paddingY: 'none' },
            id: 'cookie-decline',
            label: 'Necessary only',
            variant: 'button',
            buttonStyle: 'outline',
          },
        },
      ],
    },
  },
};

export const POPUP_STARTERS: StarterTemplate[] = [
  POPUP_STARTER_NEWSLETTER,
  POPUP_STARTER_PROMO,
];

export const DRAWER_STARTERS: StarterTemplate[] = [
  DRAWER_STARTER_INFO,
  DRAWER_STARTER_COOKIE,
];

export const STARTERS_BY_CATEGORY: Record<
  SiteTemplateCategory,
  StarterTemplate[]
> = {
  Header: HEADER_STARTERS,
  Footer: FOOTER_STARTERS,
  Search: SEARCH_STARTERS,
  Archive: ARCHIVE_STARTERS,
  MegaMenu: MEGA_MENU_STARTERS,
  Popup: POPUP_STARTERS,
  Drawer: DRAWER_STARTERS,
};

for (const starters of Object.values(STARTERS_BY_CATEGORY)) {
  for (const starter of starters) {
    starter.content = migratePuckColumns(starter.content) as BuilderData;
  }
}

export function getStarterContent(
  category: SiteTemplateCategory,
  key?: string
): BuilderData | null {
  if (!key || key === 'blank') return null;
  const found = STARTERS_BY_CATEGORY[category].find(s => s.key === key);
  return found
    ? (migratePuckColumns(
        JSON.parse(JSON.stringify(found.content))
      ) as BuilderData)
    : null;
}
