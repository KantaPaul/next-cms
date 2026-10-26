import {
  BarChart3,
  Check,
  Cloud,
  Code2,
  Cpu,
  FolderKanban,
  Globe,
  Heart,
  History,
  Layers,
  Lock,
  type LucideIcon,
  Rocket,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
} from 'lucide-react';

export const BLOCK_ICONS: Record<string, LucideIcon> = {
  Layers,
  Sparkles,
  History,
  ShieldCheck,
  FolderKanban,
  Globe,
  Code2,
  Zap,
  Shield,
  Rocket,
  Star,
  Check,
  Heart,
  Users,
  BarChart3,
  Lock,
  Cloud,
  Cpu,
};

export const ICON_OPTIONS = [
  { label: 'None', value: '' },
  ...Object.keys(BLOCK_ICONS).map(name => ({ label: name, value: name })),
];

export function BlockIcon({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  const Icon = name ? BLOCK_ICONS[name] : undefined;
  return Icon ? <Icon className={className} aria-hidden /> : null;
}
