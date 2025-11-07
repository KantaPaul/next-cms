import { ClipboardPenLine, FerrisWheel, GalleryVertical, HandCoins, User } from 'lucide-react';
import { PAGES } from '@/config/pages';

export function getMenuItems() {
  return [
    {
      name: "Categories",
      href: PAGES.DASHBOARD.CATEGORIES.INDEX,
      icon: <GalleryVertical className="w-[18px]" />,
    },
  ];
}
