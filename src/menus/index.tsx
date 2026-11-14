import {
  BarChart3,
  Database,
  FolderTree,
  GalleryVertical,
  Globe,
  ImageIcon,
  KeyRound,
  LayoutTemplate,
  PanelTop,
  CornerDownRight,
  ClipboardCheck,
  Mail,
  MenuIcon,
  Newspaper,
  Palette,
  Play,
  Plug,
  Settings,
  Share2,
  ShieldCheck,
  LayoutGrid,
  MessagesSquare,
  Wrench,
} from 'lucide-react';
import { PAGES } from '@/config/pages';
import { PERMISSIONS, type PermissionKey } from '@/config/permissions';

/** A key in the `nav` messages namespace, e.g. `settingsMenu.general`. */
export type NavLabelKey = string;

export type MenuChild = { labelKey: NavLabelKey; href: string };

export type MenuItem = {
  labelKey: NavLabelKey;
  href: string;
  icon: React.ReactNode;
  permission?: PermissionKey;
  children?: MenuChild[];
};

/** The dashboard sidebar. Labels are `nav` message keys, translated in NavMain. */
export function getMenuItems(): MenuItem[] {
  return [
    {
      labelKey: 'pages',
      href: PAGES.DASHBOARD.PAGES.INDEX,
      icon: <GalleryVertical className="w-[18px]" />,
    },
    {
      labelKey: 'analytics',
      href: PAGES.DASHBOARD.ANALYTICS,
      icon: <BarChart3 className="w-[18px]" />,
    },
    {
      labelKey: 'posts',
      href: PAGES.DASHBOARD.POSTS.INDEX,
      icon: <Newspaper className="w-[18px]" />,
    },
    {
      labelKey: 'mediaLibrary',
      href: PAGES.DASHBOARD.MEDIA,
      icon: <ImageIcon className="w-[18px]" />,
    },
    {
      labelKey: 'videos',
      href: PAGES.DASHBOARD.VIDEOS,
      icon: <Play className="w-[18px]" />,
      permission: PERMISSIONS.VIDEOS_CREATE,
    },
    {
      labelKey: 'templatesGlobals',
      href: PAGES.DASHBOARD.TEMPLATES,
      icon: <LayoutTemplate className="w-[18px]" />,
    },
    {
      labelKey: 'loopItems',
      href: PAGES.DASHBOARD.LOOP_TEMPLATES,
      icon: <LayoutGrid className="w-[18px]" />,
    },
    {
      labelKey: 'siteTemplates',
      href: PAGES.DASHBOARD.HEADER_FOOTER,
      icon: <PanelTop className="w-[18px]" />,
      children: [
        { labelKey: 'siteTemplatesMenu.headers', href: `${PAGES.DASHBOARD.HEADER_FOOTER}?type=header` },
        { labelKey: 'siteTemplatesMenu.footers', href: `${PAGES.DASHBOARD.HEADER_FOOTER}?type=footer` },
        { labelKey: 'siteTemplatesMenu.archives', href: `${PAGES.DASHBOARD.HEADER_FOOTER}?type=archive` },
        { labelKey: 'siteTemplatesMenu.search', href: `${PAGES.DASHBOARD.HEADER_FOOTER}?type=search` },
        { labelKey: 'siteTemplatesMenu.megaMenus', href: `${PAGES.DASHBOARD.HEADER_FOOTER}?type=megamenu` },
        { labelKey: 'siteTemplatesMenu.popups', href: `${PAGES.DASHBOARD.HEADER_FOOTER}?type=popup` },
        { labelKey: 'siteTemplatesMenu.drawers', href: `${PAGES.DASHBOARD.HEADER_FOOTER}?type=drawer` },
      ],
    },
    {
      labelKey: 'contactForms',
      href: PAGES.DASHBOARD.CONTACT_FORMS,
      icon: <Mail className="w-[18px]" />,
    },
    {
      labelKey: 'comments',
      href: PAGES.DASHBOARD.COMMENTS,
      icon: <MessagesSquare className="w-[18px]" />,
      permission: PERMISSIONS.COMMENTS_MODERATE,
    },
    {
      labelKey: 'review',
      href: PAGES.DASHBOARD.REVIEW,
      icon: <ClipboardCheck className="w-[18px]" />,
      permission: PERMISSIONS.PAGES_PUBLISH,
    },
    {
      labelKey: 'redirects',
      href: PAGES.DASHBOARD.REDIRECTS,
      icon: <CornerDownRight className="w-[18px]" />,
      permission: PERMISSIONS.SETTINGS_MANAGE,
    },
    {
      labelKey: 'taxonomies',
      href: PAGES.DASHBOARD.TAXONOMY,
      icon: <FolderTree className="w-[18px]" />,
      permission: PERMISSIONS.SETTINGS_MANAGE,
    },
    {
      labelKey: 'menus',
      href: PAGES.DASHBOARD.MENUS,
      icon: <MenuIcon className="w-[18px]" />,
      permission: PERMISSIONS.SETTINGS_MANAGE,
    },
    {
      labelKey: 'theme',
      href: PAGES.DASHBOARD.THEME,
      icon: <Palette className="w-[18px]" />,
      permission: PERMISSIONS.SETTINGS_MANAGE,
    },
    {
      labelKey: 'settings',
      href: PAGES.DASHBOARD.SETTINGS,
      icon: <Settings className="w-[18px]" />,
      permission: PERMISSIONS.SETTINGS_MANAGE,
      children: [
        { labelKey: 'settingsMenu.general', href: PAGES.DASHBOARD.SETTINGS },
        { labelKey: 'settingsMenu.branding', href: PAGES.DASHBOARD.SETTINGS_BRANDING },
        { labelKey: 'settingsMenu.navigation', href: PAGES.DASHBOARD.SETTINGS_NAVIGATION },
        { labelKey: 'settingsMenu.search', href: PAGES.DASHBOARD.SETTINGS_SEARCH },
        { labelKey: 'settingsMenu.singlePages', href: PAGES.DASHBOARD.SETTINGS_SINGLE_PAGES },
        { labelKey: 'settingsMenu.videoLibrary', href: PAGES.DASHBOARD.SETTINGS_VIDEO_LIBRARY },
        { labelKey: 'settingsMenu.authentication', href: PAGES.DASHBOARD.SETTINGS_AUTHENTICATION },
        { labelKey: 'settingsMenu.siteMode', href: PAGES.DASHBOARD.SETTINGS_SITE_MODE },
        { labelKey: 'settingsMenu.seo', href: PAGES.DASHBOARD.SETTINGS_SEO },
        { labelKey: 'settingsMenu.languages', href: PAGES.DASHBOARD.SETTINGS_LANGUAGES },
        { labelKey: 'settingsMenu.breakpoints', href: PAGES.DASHBOARD.SETTINGS_BREAKPOINTS },
        { labelKey: 'settingsMenu.consent', href: PAGES.DASHBOARD.SETTINGS_CONSENT },
        { labelKey: 'settingsMenu.customCode', href: PAGES.DASHBOARD.SETTINGS_CUSTOM_CODE },
        { labelKey: 'settingsMenu.blocks', href: PAGES.DASHBOARD.SETTINGS_BLOCKS },
        { labelKey: 'settingsMenu.license', href: PAGES.DASHBOARD.SETTINGS_LICENSE },
      ],
    },
    {
      labelKey: 'plugins',
      href: PAGES.DASHBOARD.PLUGINS,
      icon: <Plug className="w-[18px]" />,
      permission: PERMISSIONS.SETTINGS_MANAGE,
    },
    {
      labelKey: 'usersRoles',
      href: PAGES.DASHBOARD.USERS,
      icon: <ShieldCheck className="w-[18px]" />,
      permission: PERMISSIONS.SETTINGS_MANAGE,
    },
    {
      labelKey: 'apiKeys',
      href: PAGES.DASHBOARD.API,
      icon: <KeyRound className="w-[18px]" />,
      permission: PERMISSIONS.API_MANAGE,
    },
    {
      labelKey: 'externalApi',
      href: PAGES.DASHBOARD.EXTERNAL_API,
      icon: <Globe className="w-[18px]" />,
      permission: PERMISSIONS.EXTERNAL_API_MANAGE,
    },
    {
      labelKey: 'postTypes',
      href: PAGES.DASHBOARD.COLLECTIONS,
      icon: <Database className="w-[18px]" />,
      permission: PERMISSIONS.PAGES_EDIT,
    },
    {
      labelKey: 'webhooks',
      href: PAGES.DASHBOARD.WEBHOOKS,
      icon: <Share2 className="w-[18px]" />,
      permission: PERMISSIONS.SETTINGS_MANAGE,
    },
    {
      labelKey: 'tools',
      href: PAGES.DASHBOARD.TOOLS_IMPORT,
      icon: <Wrench className="w-[18px]" />,
      permission: PERMISSIONS.SETTINGS_MANAGE,
      children: [
        { labelKey: 'toolsMenu.import', href: PAGES.DASHBOARD.TOOLS_IMPORT },
        { labelKey: 'toolsMenu.privacy', href: PAGES.DASHBOARD.TOOLS_PRIVACY },
        { labelKey: 'toolsMenu.backups', href: PAGES.DASHBOARD.TOOLS_BACKUPS },
      ],
    },
  ];
}
