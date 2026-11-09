'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import type { UrlValue } from '../style';
import { el, type WithSection } from './element';
import { ButtonLink, Section } from './section';
import { BlockIcon } from '../icons';

export type FlipBoxProps = WithSection & {
  direction?: 'flip-left' | 'flip-right' | 'flip-up' | 'flip-down';
  height?: number;
  frontIcon?: string;
  frontImage?: string;
  frontTitle?: string;
  frontDescription?: string;
  frontBgColor?: string;
  backTitle?: string;
  backDescription?: string;
  backButtonText?: string;
  backButtonLink?: UrlValue;
  backButtonVariant?: 'primary' | 'secondary' | 'outline' | 'soft';
  backBgColor?: string;
};

export function FlipBox(p: FlipBoxProps) {
  const [flipped, setFlipped] = useState(false);
  const direction = p.direction ?? 'flip-left';
  const height = p.height ?? 320;

  const frontPart = el(p, 'front', 'rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-md bg-white border border-steel-200 dark:bg-dark-100 dark:border-dark-300');
  const backPart = el(p, 'back', 'rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg s-primary-bg text-white border border-primary');
  const frontTitleEl = el(p, 'frontTitle', 'text-xl font-bold tracking-tight text-foreground');
  const frontDescEl = el(p, 'frontDesc', 'mt-3 text-sm text-steel-500 leading-relaxed dark:text-steel-400');
  const backTitleEl = el(p, 'backTitle', 'text-xl font-bold tracking-tight text-white');
  const backDescEl = el(p, 'backDesc', 'mt-3 text-sm leading-relaxed text-white/90');
  const backBtnEl = el(p, 'backButton');

  // Rotation class names for CSS 3D
  const backRotateClass =
    direction === 'flip-left'
      ? 'rotate-y-180'
      : direction === 'flip-right'
        ? '-rotate-y-180'
        : direction === 'flip-up'
          ? '-rotate-x-180'
          : 'rotate-x-180';

  const flippedTransformClass =
    direction === 'flip-left'
      ? '[transform:rotateY(-180deg)]'
      : direction === 'flip-right'
        ? '[transform:rotateY(180deg)]'
        : direction === 'flip-up'
          ? '[transform:rotateX(180deg)]'
          : '[transform:rotateX(-180deg)]';

  const hoverTransformClass =
    direction === 'flip-left'
      ? 'group-hover:[transform:rotateY(-180deg)] group-focus-within:[transform:rotateY(-180deg)]'
      : direction === 'flip-right'
        ? 'group-hover:[transform:rotateY(180deg)] group-focus-within:[transform:rotateY(180deg)]'
        : direction === 'flip-up'
          ? 'group-hover:[transform:rotateX(180deg)] group-focus-within:[transform:rotateX(180deg)]'
          : 'group-hover:[transform:rotateX(-180deg)] group-focus-within:[transform:rotateX(-180deg)]';

  return (
    <Section section={p.section} editing={p.editing} id={p.id ?? p.nodeId}>
      <div
        className="group w-full max-w-sm mx-auto [perspective:1000px] cursor-pointer"
        style={{ height: `${height}px` }}
        onClick={() => setFlipped(!flipped)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setFlipped(!flipped);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={p.frontTitle || 'Flip Box'}
      >
        <div
          className={cn(
            'relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d]',
            hoverTransformClass,
            flipped && flippedTransformClass
          )}
        >
          {/* Front Face */}
          <div
            className={cn(
              'absolute inset-0 h-full w-full [backface-visibility:hidden]',
              frontPart.className
            )}
            style={{
              ...(p.frontBgColor ? { backgroundColor: p.frontBgColor } : {}),
              ...frontPart.style,
            }}
          >
            {p.frontIcon && (
              <span className="mb-4 inline-flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BlockIcon name={p.frontIcon} className="size-7" />
              </span>
            )}
            {p.frontImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.frontImage}
                alt=""
                className="mb-4 size-20 rounded-xl object-cover"
              />
            )}
            {p.frontTitle && (
              <h3 className={frontTitleEl.className} style={frontTitleEl.style}>
                {p.frontTitle}
              </h3>
            )}
            {p.frontDescription && (
              <p className={frontDescEl.className} style={frontDescEl.style}>
                {p.frontDescription}
              </p>
            )}
          </div>

          {/* Back Face */}
          <div
            className={cn(
              'absolute inset-0 h-full w-full [backface-visibility:hidden]',
              direction === 'flip-left' && '[transform:rotateY(180deg)]',
              direction === 'flip-right' && '[transform:rotateY(-180deg)]',
              direction === 'flip-up' && '[transform:rotateX(-180deg)]',
              direction === 'flip-down' && '[transform:rotateX(180deg)]',
              backPart.className
            )}
            style={{
              ...(p.backBgColor ? { backgroundColor: p.backBgColor } : {}),
              ...backPart.style,
            }}
          >
            {p.backTitle && (
              <h3 className={backTitleEl.className} style={backTitleEl.style}>
                {p.backTitle}
              </h3>
            )}
            {p.backDescription && (
              <p className={backDescEl.className} style={backDescEl.style}>
                {p.backDescription}
              </p>
            )}
            {p.backButtonText && (
              <div className="mt-6">
                <ButtonLink
                  href={p.backButtonLink}
                  variant={p.backButtonVariant ?? 'light'}
                  className={backBtnEl.className}
                  style={backBtnEl.style}
                >
                  {p.backButtonText}
                </ButtonLink>
              </div>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
