import {
  ArrowLeftRight,
  ArrowUp,
  AudioLines,
  Bookmark,
  Tags,
  UserRound,
  BarChart3,
  Bell,
  Blend,
  Box,
  Building2,
  ChevronsUpDown,
  Clapperboard,
  ClipboardList,
  Code2,
  Columns3,
  CreditCard,
  Database,
  FileText,
  Frame,
  GalleryHorizontal,
  Globe,
  Heading1,
  HelpCircle,
  Image,
  Images,
  Info,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  Megaphone,
  Menu,
  Milestone,
  MousePointerClick,
  MoveVertical,
  Newspaper,
  PanelTop,
  Phone,
  Quote,
  Search,
  Share2,
  Sparkles,
  Square,
  Sun,
  Type,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';
import React from 'react';

/** Icon names used by block definitions (`icon`), lower-case. */
const ICONS: Record<string, LucideIcon> = {
  hero: Sparkles,
  cta: Megaphone,
  features: LayoutGrid,
  stats: BarChart3,
  pricing: CreditCard,
  testimonials: Quote,
  faq: HelpCircle,
  logocloud: Building2,
  team: Users,
  timeline: Milestone,
  columns: Columns3,
  container: Square,
  layout: PanelTop,
  button: MousePointerClick,
  spacer: MoveVertical,
  imagemorph: Blend,
  slider: GalleryHorizontal,
  tabs: Frame,
  accordion: ChevronsUpDown,
  richtext: Type,
  text: Type,
  image: Image,
  gallery: Images,
  video: Video,
  videolibrary: Clapperboard,
  embed: Code2,
  code: Code2,
  map: MapPin,
  newsletter: Mail,
  contactform: ClipboardList,
  collectionitem: Database,
  globalref: Globe,
  globe: Globe,
  blogposts: Newspaper,
  posttitle: Heading1,
  postfeaturedimage: Image,
  postmeta: Info,
  postcontent: FileText,
  relatedposts: Newspaper,
  menu: Menu,
  list: List,
  search: Search,
  bell: Bell,
  'share-2': Share2,
  phone: Phone,
  'file-text': FileText,
  'arrow-up': ArrowUp,
  sun: Sun,
  authorbio: UserRound,
  postnavigation: ArrowLeftRight,
  bookmarks: Bookmark,
  audio: AudioLines,
  entryterms: Tags,
};

export interface BlockIconProps {
  /** Icon name from the block definition; unknown names fall back. */
  name?: string;
  /** Used for the fallback letter when `name` has no icon. */
  label: string;
  className?: string;
}

/** Lucide icon for a block's `icon` name, or its first letter. */
export const BlockIcon: React.FC<BlockIconProps> = ({
  name,
  label,
  className = 'h-4 w-4',
}) => {
  const Icon = name ? ICONS[name.toLowerCase()] : undefined;
  if (Icon) return <Icon aria-hidden className={className} />;
  if (!label) return <Box aria-hidden className={className} />;
  return (
    <span aria-hidden className="text-xs font-semibold leading-none">
      {label.charAt(0).toUpperCase()}
    </span>
  );
};
