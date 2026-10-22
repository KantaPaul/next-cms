import {
  FolderTree,
  GalleryVertical,
  ImageIcon,
  KeyRound,
  LayoutTemplate,
  Mail,
  MenuIcon,
  Newspaper,
  Palette,
  ShieldCheck,
} from 'lucide-react';
import { PAGES } from '@/config/pages';
import { PERMISSIONS, type PermissionKey } from '@/config/permissions';

export function getMenuItems(): {
  name: string;
  href: string;
  icon: React.ReactNode;
  permission?: PermissionKey;
}[] {
  return [
    {
      name: 'Pages',
      href: PAGES.DASHBOARD.PAGES.INDEX,
      icon: <GalleryVertical className="w-[18px]" />,
    },
    {
      name: 'Posts',
      href: PAGES.DASHBOARD.POSTS.INDEX,
      icon: <Newspaper className="w-[18px]" />,
    },
    {
      name: 'Media Library',
      href: PAGES.DASHBOARD.MEDIA,
      icon: <ImageIcon className="w-[18px]" />,
    },
    {
      name: 'Templates & Globals',
      href: PAGES.DASHBOARD.TEMPLATES,
      icon: <LayoutTemplate className="w-[18px]" />,
    },
    {
      name: 'Contact forms',
      href: PAGES.DASHBOARD.CONTACT_FORMS,
      icon: <Mail className="w-[18px]" />,
    },
    {
      name: 'Taxonomies',
      href: PAGES.DASHBOARD.TAXONOMY,
      icon: <FolderTree className="w-[18px]" />,
      permission: PERMISSIONS.SETTINGS_MANAGE,
    },
    {
      name: 'Menus',
      href: PAGES.DASHBOARD.MENUS,
      icon: <MenuIcon className="w-[18px]" />,
      permission: PERMISSIONS.SETTINGS_MANAGE,
    },
    {
      name: 'Settings & Theme',
      href: PAGES.DASHBOARD.SETTINGS,
      icon: <Palette className="w-[18px]" />,
      permission: PERMISSIONS.SETTINGS_MANAGE,
    },
    {
      name: 'Users & Roles',
      href: PAGES.DASHBOARD.USERS,
      icon: <ShieldCheck className="w-[18px]" />,
      permission: PERMISSIONS.SETTINGS_MANAGE,
    },
    {
      name: 'API Keys',
      href: PAGES.DASHBOARD.API,
      icon: <KeyRound className="w-[18px]" />,
      permission: PERMISSIONS.API_MANAGE,
    },
  ];
}
