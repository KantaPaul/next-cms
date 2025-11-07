import { ClipboardPenLine, FerrisWheel, GalleryVertical, HandCoins, User } from 'lucide-react';
import { PAGES } from '@/config/pages';

export function getMenuItems() {
  return [
    {
      name: 'Pages',
      href: PAGES.DASHBOARD.PAGES.INDEX,
      icon: <GalleryVertical className="w-[18px]" />,
    },
  ];
}
