import { AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { ElementStyle } from '../style';
import { el } from './element';
import { Section, type SectionSettings } from './section';

export type AudioProps = {
  section?: SectionSettings;
  editing?: boolean;
  elements?: Record<string, ElementStyle>;
  url?: string;
  title?: string;
  caption?: string;
  coverImage?: string;
  width?: 'narrow' | 'normal' | 'wide';
};

const WIDTH = { narrow: 'max-w-xl', normal: 'max-w-3xl', wide: 'max-w-5xl' };

/** http(s) or same-site paths only. */
function safeSrc(url: string | undefined): string | null {
  const v = url?.trim();
  if (!v) return null;
  return /^https?:\/\//i.test(v) || (v.startsWith('/') && !v.startsWith('//'))
    ? v
    : null;
}

/** An audio file (podcast, field recording) in a card with the browser's player. */
export function Audio(p: AudioProps) {
  const src = safeSrc(p.url);
  if (!src && !p.editing) return null;
  const cover = safeSrc(p.coverImage);
  return (
    <Section
      section={p.section}
      editing={p.editing}
      innerClassName={WIDTH[p.width ?? 'normal']}
    >
      <figure {...el(p, 'card', 's-card s-card-outline flex flex-col gap-4 p-5 sm:flex-row sm:items-center')}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="size-20 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="s-soft-primary flex size-14 shrink-0 items-center justify-center rounded-full"
          >
            <AudioLines className="size-6" />
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-3">
          {(p.title || p.caption) && (
            <figcaption>
              {p.title ? (
                <p {...el(p, 'title', 'text-lg font-medium [font-family:var(--site-font-heading)]')}>
                  {p.title}
                </p>
              ) : null}
              {p.caption ? (
                <p className="s-meta mt-0.5">{p.caption}</p>
              ) : null}
            </figcaption>
          )}
          {src ? (
            // biome-ignore lint/a11y/useMediaCaption: user-provided audio, captions not available
            <audio
              controls
              preload="none"
              src={src}
              className={cn('w-full', '[color-scheme:light_dark]')}
            >
              <a href={src}>Download the audio</a>
            </audio>
          ) : (
            <p className="s-muted text-sm">Add an audio file URL in the sidebar.</p>
          )}
        </div>
      </figure>
    </Section>
  );
}
