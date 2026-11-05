import {
  Award,
  BookOpen,
  Briefcase,
  Calendar,
  CircleHelp,
  Database,
  Image,
  MapPin,
  MessageSquareQuote,
  Package,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { PostTypeIcon as PostTypeIconName } from '@/config/post-types';

const ICONS: Record<PostTypeIconName, LucideIcon> = {
  database: Database,
  users: Users,
  'message-square-quote': MessageSquareQuote,
  'circle-help': CircleHelp,
  briefcase: Briefcase,
  calendar: Calendar,
  star: Star,
  'map-pin': MapPin,
  'book-open': BookOpen,
  package: Package,
  award: Award,
  image: Image,
};

/** Renders a post type's chosen icon, falling back to a database icon. */
export function PostTypeIcon({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const Icon = (name && ICONS[name as PostTypeIconName]) || Database;
  return <Icon className={className} aria-hidden />;
}
