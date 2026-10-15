import { Check, Quote } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { BlockIcon } from '../icons';
import { ButtonLink, Section, SectionHeading, type SectionSettings } from './section';
import { PricingToggle } from './pricing-toggle';

type WithSection = { section?: SectionSettings; editing?: boolean };

export type HeroProps = WithSection & {
  badge?: string;
  title: string;
  subtitle?: string;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  imageUrl?: string;
  imageAlt?: string;
  alignment?: 'left' | 'center';
};

export function Hero(p: HeroProps) {
  const centered = p.alignment !== 'left';
  const split = !centered && !!p.imageUrl;

  return (
    <Section section={p.section} editing={p.editing}>
      <div className={cn('grid items-center gap-12', split && 'lg:grid-cols-2')}>
        <div className={cn(centered && 'mx-auto max-w-3xl text-center')}>
          {p.badge && (
            <span className="s-soft-primary mb-6 inline-flex rounded-full px-3 py-1 text-xs font-semibold">{p.badge}</span>
          )}
          <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">{p.title}</h1>
          {p.subtitle && <p className="s-muted mt-6 text-lg leading-relaxed md:text-xl">{p.subtitle}</p>}
          {(p.primaryButtonText || p.secondaryButtonText) && (
            <div className={cn('mt-8 flex flex-wrap gap-3', centered && 'justify-center')}>
              <ButtonLink href={p.primaryButtonLink}>{p.primaryButtonText}</ButtonLink>
              <ButtonLink href={p.secondaryButtonLink} variant="secondary">
                {p.secondaryButtonText}
              </ButtonLink>
            </div>
          )}
        </div>
        {p.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imageUrl}
            alt={p.imageAlt ?? ''}
            className={cn('s-radius s-border w-full border object-cover shadow-xl', centered ? 'mx-auto mt-4 max-w-5xl' : 'aspect-[4/3]')}
          />
        )}
      </div>
    </Section>
  );
}

export type FeaturesProps = WithSection & {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  columns?: 2 | 3 | 4;
  items: { icon?: string; title: string; description?: string }[];
};

const GRID_COLS = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-2 lg:grid-cols-3', 4: 'md:grid-cols-2 lg:grid-cols-4' };

export function Features(p: FeaturesProps) {
  return (
    <Section section={p.section} editing={p.editing}>
      <SectionHeading eyebrow={p.eyebrow} title={p.title} subtitle={p.subtitle} />
      <div className={cn('grid gap-6', GRID_COLS[p.columns ?? 3])}>
        {(p.items ?? []).map((item, i) => (
          <div key={i} className="s-surface s-border s-radius border p-6">
            {item.icon && (
              <div className="s-soft-primary s-radius mb-4 inline-flex p-2.5">
                <BlockIcon name={item.icon} className="size-5" />
              </div>
            )}
            <h3 className="text-lg font-semibold">{item.title}</h3>
            {item.description && <p className="s-muted mt-2 leading-relaxed">{item.description}</p>}
          </div>
        ))}
      </div>
    </Section>
  );
}

export type StatsProps = WithSection & {
  headline?: string;
  items: { value: string; label: string; change?: string }[];
};

export function Stats(p: StatsProps) {
  return (
    <Section section={p.section} editing={p.editing}>
      {p.headline && <p className="s-muted mb-8 text-center text-sm font-semibold uppercase tracking-wider">{p.headline}</p>}
      <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {(p.items ?? []).map((item, i) => (
          <div key={i} className="flex flex-col text-center">
            <dt className="order-2 mt-1 text-sm font-medium">{item.label}</dt>
            <dd className="s-primary-text order-1 text-3xl font-extrabold md:text-4xl">{item.value}</dd>
            {item.change && <dd className="s-muted order-3 mt-1 text-xs">{item.change}</dd>}
          </div>
        ))}
      </dl>
    </Section>
  );
}

export type PricingPlan = {
  name: string;
  price: string;
  yearlyPrice?: string;
  period?: string;
  description?: string;
  features?: { text: string }[] | string[];
  buttonText?: string;
  buttonLink?: string;
  popular?: boolean;
};

export type PricingProps = WithSection & {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  showToggle?: boolean;
  plans: PricingPlan[];
};

const featureText = (f: { text: string } | string) => (typeof f === 'string' ? f : f.text);

export function Pricing(p: PricingProps) {
  const plans = p.plans ?? [];
  const hasYearly = plans.some(plan => plan.yearlyPrice);

  const cards = (yearly: boolean) => (
    <div className={cn('grid gap-6', plans.length >= 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2', 'items-stretch')}>
      {plans.map((plan, i) => (
        <div
          key={i}
          className={cn(
            's-radius relative flex flex-col border p-7',
            plan.popular ? 'shadow-xl ring-2 ring-[color:var(--site-primary)]' : 's-border s-surface'
          )}
        >
          {plan.popular && (
            <span className="s-primary-bg absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold">
              Most popular
            </span>
          )}
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          {plan.description && <p className="s-muted mt-1 text-sm">{plan.description}</p>}
          <p className="mt-5 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold">{yearly && plan.yearlyPrice ? plan.yearlyPrice : plan.price}</span>
            {plan.period && <span className="s-muted text-sm">{yearly && plan.yearlyPrice ? 'per year' : plan.period}</span>}
          </p>
          <ul className="mt-6 flex-1 space-y-2.5 text-sm">
            {(plan.features ?? []).map((f, j) => (
              <li key={j} className="flex gap-2">
                <Check className="s-primary-text mt-0.5 size-4 shrink-0" aria-hidden />
                {featureText(f)}
              </li>
            ))}
          </ul>
          {plan.buttonText && (
            <div className="mt-7 [&>a]:w-full">
              <ButtonLink href={plan.buttonLink} variant={plan.popular ? 'primary' : 'secondary'}>
                {plan.buttonText}
              </ButtonLink>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Section section={p.section} editing={p.editing}>
      <SectionHeading eyebrow={p.eyebrow} title={p.title} subtitle={p.subtitle} />
      {p.showToggle && hasYearly ? <PricingToggle monthly={cards(false)} yearly={cards(true)} /> : cards(false)}
    </Section>
  );
}

export type TestimonialsProps = WithSection & {
  eyebrow?: string;
  title?: string;
  items: { quote: string; author: string; role?: string; company?: string; avatar?: string }[];
};

export function Testimonials(p: TestimonialsProps) {
  return (
    <Section section={p.section} editing={p.editing}>
      <SectionHeading eyebrow={p.eyebrow} title={p.title} />
      <div className="grid gap-6 md:grid-cols-2">
        {(p.items ?? []).map((item, i) => (
          <figure key={i} className="s-surface s-border s-radius flex flex-col border p-7">
            <Quote className="s-primary-text mb-4 size-6" aria-hidden />
            <blockquote className="flex-1 text-lg leading-relaxed">“{item.quote}”</blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              {item.avatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.avatar} alt="" className="size-11 rounded-full object-cover" />
              )}
              <div>
                <p className="font-semibold">{item.author}</p>
                {(item.role || item.company) && (
                  <p className="s-muted text-sm">{[item.role, item.company].filter(Boolean).join(', ')}</p>
                )}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

export type FaqProps = WithSection & {
  eyebrow?: string;
  title?: string;
  items: { question: string; answer: string }[];
};

export function Faq(p: FaqProps) {
  return (
    <Section section={p.section} editing={p.editing} innerClassName="max-w-3xl">
      <SectionHeading eyebrow={p.eyebrow} title={p.title} />
      <div className="s-border divide-y divide-[color:var(--site-border)] border-y">
        {(p.items ?? []).map((item, i) => (
          <details key={i} className="group py-5" open={p.editing && i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
              {item.question}
              <span className="s-muted text-xl transition group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <p className="s-muted mt-3 leading-relaxed">{item.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

export type CtaProps = WithSection & {
  badge?: string;
  title: string;
  description?: string;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  variant?: 'gradient' | 'primary' | 'subtle';
};

export function Cta(p: CtaProps) {
  const variant = p.variant ?? 'gradient';
  const onColor = variant !== 'subtle';
  return (
    <Section section={p.section} editing={p.editing}>
      <div
        className={cn(
          's-radius px-6 py-14 text-center md:px-16',
          variant === 'gradient' && 's-gradient',
          variant === 'primary' && 's-primary-bg',
          variant === 'subtle' && 's-surface s-border border'
        )}
      >
        {p.badge && (
          <span
            className={cn(
              'mb-5 inline-flex rounded-full px-3 py-1 text-xs font-semibold',
              onColor ? 'bg-white/20 text-white' : 's-soft-primary'
            )}
          >
            {p.badge}
          </span>
        )}
        <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">{p.title}</h2>
        {p.description && (
          <p className={cn('mx-auto mt-4 max-w-2xl text-lg', onColor ? 'text-white/85' : 's-muted')}>{p.description}</p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href={p.primaryButtonLink} variant={onColor ? 'light' : 'primary'}>
            {p.primaryButtonText}
          </ButtonLink>
          <ButtonLink href={p.secondaryButtonLink} variant={onColor ? 'ghost-light' : 'secondary'}>
            {p.secondaryButtonText}
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
