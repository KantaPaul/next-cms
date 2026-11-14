'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { el, type WithSection } from './element';
import { Section } from './section';

export type AnimatedHeadlineProps = WithSection & {
  styleType?: 'highlight' | 'rotating';
  highlightShape?: 'circle' | 'underline' | 'curly' | 'strikethrough';
  rotatingEffect?: 'typing' | 'fade' | 'slide';
  beforeText?: string;
  highlightedText?: string;
  rotatingWords?: string[];
  afterText?: string;
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'p';
  alignment?: 'left' | 'center' | 'right';
  strokeColor?: string;
  duration?: number;
};

export function AnimatedHeadline(p: AnimatedHeadlineProps) {
  const styleType = p.styleType ?? 'highlight';
  const shape = p.highlightShape ?? 'circle';
  const effect = p.rotatingEffect ?? 'fade';
  const before = p.beforeText ?? 'Build';
  const highlighted = p.highlightedText ?? 'incredible';
  const words = p.rotatingWords && p.rotatingWords.length > 0
    ? p.rotatingWords
    : ['fast', 'modern', 'powerful'];
  const after = p.afterText ?? 'websites';
  const Tag = p.tag ?? 'h2';
  const align = p.alignment ?? 'center';
  const duration = p.duration ?? 2500;
  const strokeColor = p.strokeColor || 'currentColor';

  const [wordIndex, setWordIndex] = useState(0);
  const [typedText, setTypedText] = useState(words[0] || '');
  const [isTyping, setIsTyping] = useState(true);

  // Rotating animation loop
  useEffect(() => {
    if (styleType !== 'rotating' || words.length <= 1) return;
    if (typeof window === 'undefined') return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTypedText(words[0] || '');
      return;
    }

    if (effect === 'typing') {
      let charIndex = 0;
      let deleting = false;
      let timeoutId: NodeJS.Timeout;

      const currentWord = words[wordIndex] || '';

      const typeLoop = () => {
        if (!deleting) {
          setTypedText(currentWord.slice(0, charIndex + 1));
          charIndex++;
          if (charIndex === currentWord.length) {
            deleting = true;
            timeoutId = setTimeout(typeLoop, 1500); // Pause at end
            return;
          }
        } else {
          setTypedText(currentWord.slice(0, charIndex - 1));
          charIndex--;
          if (charIndex === 0) {
            deleting = false;
            setWordIndex(prev => (prev + 1) % words.length);
            return;
          }
        }
        timeoutId = setTimeout(typeLoop, deleting ? 50 : 100);
      };

      timeoutId = setTimeout(typeLoop, 100);
      return () => clearTimeout(timeoutId);
    }

    const interval = setInterval(() => {
      setWordIndex(prev => (prev + 1) % words.length);
    }, duration);

    return () => clearInterval(interval);
  }, [styleType, words, wordIndex, effect, duration]);

  const headingEl = el(p, 'heading', 'text-3xl s-tab-text-5xl font-extrabold tracking-tight text-[var(--site-fg)] leading-tight');
  const animatedEl = el(p, 'animated', 's-primary-text relative inline-block');

  const renderSvgShape = () => {
    if (shape === 'circle') {
      return (
        <svg
          viewBox="0 0 500 150"
          className="absolute -top-[25%] -start-[10%] w-[120%] h-[150%] pointer-events-none stroke-primary"
          style={{ stroke: strokeColor }}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 20 75 C 20 20, 480 20, 480 75 C 480 130, 20 130, 15 80"
            className="animate-svg-stroke"
            strokeDasharray="1200"
            strokeDashoffset="0"
          />
        </svg>
      );
    }
    if (shape === 'underline') {
      return (
        <svg
          viewBox="0 0 500 40"
          className="absolute -bottom-2 start-0 w-full h-4 pointer-events-none stroke-primary"
          style={{ stroke: strokeColor }}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 10 30 Q 250 5 490 25"
            strokeDasharray="600"
            strokeDashoffset="0"
          />
        </svg>
      );
    }
    if (shape === 'curly') {
      return (
        <svg
          viewBox="0 0 500 40"
          className="absolute -bottom-3 start-0 w-full h-5 pointer-events-none stroke-primary"
          style={{ stroke: strokeColor }}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 10 20 Q 70 5 130 20 T 250 20 T 370 20 T 490 20"
            strokeDasharray="600"
            strokeDashoffset="0"
          />
        </svg>
      );
    }
    // strikethrough
    return (
      <svg
        viewBox="0 0 500 20"
        className="absolute top-1/2 start-0 w-full h-3 -translate-y-1/2 pointer-events-none stroke-primary"
        style={{ stroke: strokeColor }}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line x1="5" y1="10" x2="495" y2="10" strokeDasharray="500" strokeDashoffset="0" />
      </svg>
    );
  };

  return (
    <Section section={p.section} editing={p.editing} id={p.id ?? p.nodeId}>
      <Tag
        className={cn(
          headingEl.className,
          align === 'center'
            ? 'text-center'
            : align === 'right'
              ? 'text-end'
              : 'text-start'
        )}
        style={headingEl.style}
      >
        {before && <span>{before} </span>}

        {styleType === 'highlight' && (
          <span className={cn(animatedEl.className, 'px-2')} style={animatedEl.style}>
            {highlighted}
            {renderSvgShape()}
          </span>
        )}

        {styleType === 'rotating' && (
          <span className={cn(animatedEl.className, 'min-w-[4ch]')} style={animatedEl.style}>
            {effect === 'typing' ? (
              <span>
                {typedText}
                <span className="animate-pulse">|</span>
              </span>
            ) : effect === 'slide' ? (
              <span className="transition-all duration-300 transform inline-block">
                {words[wordIndex]}
              </span>
            ) : (
              <span className="animate-fade-in transition-opacity duration-300">
                {words[wordIndex]}
              </span>
            )}
          </span>
        )}

        {after && <span> {after}</span>}
      </Tag>
    </Section>
  );
}
