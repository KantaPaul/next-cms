import { cn } from '@/lib/utils/cn';
import type { UrlValue } from '../style';
import { ButtonLink, type SectionSettings, Section } from './section';

type WithSection = { section?: SectionSettings; editing?: boolean };

export type ButtonProps = WithSection & {
  label?: string;
  link?: UrlValue;
  alignment?: 'center' | 'left';
};

export function Button(p: ButtonProps) {
  return (
    <Section section={p.section} editing={p.editing}>
      <div
        className={cn(
          'flex w-full',
          p.alignment === 'center' ? 'justify-center' : 'justify-start'
        )}
      >
        <ButtonLink href={p.link}>{p.label}</ButtonLink>
      </div>
    </Section>
  );
}

export type SpacerProps = WithSection & {
  /** Height in px, clamped. */
  height?: number;
};

export function Spacer(p: SpacerProps) {
  const height =
    typeof p.height === 'number' && Number.isFinite(p.height)
      ? Math.min(400, Math.max(0, Math.round(p.height)))
      : 0;

  return (
    <Section section={p.section} editing={p.editing}>
      <div style={{ height: `${height}px` }} />
    </Section>
  );
}
