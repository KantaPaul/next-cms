import { cn } from '@/lib/utils/cn';
import type { UrlValue } from '../style';
import { el, type WithSection } from './element';
import { ButtonLink, type SectionSettings, Section } from './section';

export type ButtonProps = WithSection & {
  label?: string;
  link?: UrlValue;
  linkAction?: 'url' | 'overlay';
  overlayId?: string;
  alignment?: 'center' | 'left' | 'right';
  variant?: 'primary' | 'secondary' | 'outline' | 'soft';
  size?: 'sm' | 'md' | 'lg';
};

const BUTTON_SIZE = {
  sm: 'px-4 py-2 text-sm',
  md: '',
  lg: 'px-7 py-3.5 text-base',
};

export function Button(p: ButtonProps) {
  const btnEl = el(p, 'button');
  const isOverlayAction = p.linkAction === 'overlay' && Boolean(p.overlayId);
  const targetLink = isOverlayAction ? `#overlay:${p.overlayId}` : p.link;
  const overlayAttr = isOverlayAction ? p.overlayId : undefined;

  return (
    <Section section={p.section} editing={p.editing}>
      <div
        className={cn(
          'flex w-full',
          p.alignment === 'center'
            ? 'justify-center'
            : p.alignment === 'right'
              ? 'justify-end'
              : 'justify-start'
        )}
      >
        <ButtonLink
          href={targetLink}
          data-overlay-open={overlayAttr}
          variant={p.variant ?? 'primary'}
          className={cn(BUTTON_SIZE[p.size ?? 'md'], btnEl.className)}
          style={btnEl.style}
        >
          {p.label}
        </ButtonLink>
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
