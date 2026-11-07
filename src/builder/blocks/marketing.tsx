import { Check, Quote } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { BlockIcon } from '../icons';
import { resolveLinkProps, type UrlValue } from '../style';
import { el, orderedParts, type WithSection } from './element';
import { PricingToggle } from './pricing-toggle';
import {
  ButtonLink,
  MotionItem,
  Section,
  SectionHeading,
  type SectionSettings,
} from './section';

export type HeroProps = WithSection & {
  badge?: string;
  title: string;
  subtitle?: string;
  primaryButtonText?: string;
  primaryButtonLink?: UrlValue;
  secondaryButtonText?: string;
  secondaryButtonLink?: UrlValue;
  imageUrl?: string;
  imageAlt?: string;
  alignment?: 'left' | 'center';
};

export function Hero(p: HeroProps) {
  const centered = p.alignment !== 'left';
  const split = !centered && !!p.imageUrl;
  const badgeEl = el(
    p,
    'badge',
    's-soft-primary mb-6 inline-flex rounded-full px-3.5 py-1 text-xs font-semibold uppercase tracking-wider'
  );
  const titleEl = el(
    p,
    'title',
    's-type-display tracking-tight text-balance'
  );
  const subtitleEl = el(
    p,
    'subtitle',
    's-muted s-type-body mt-6 text-lg leading-relaxed md:text-xl text-pretty max-w-2xl'
  );
  const primaryBtnEl = el(p, 'primaryButton');
  const secondaryBtnEl = el(p, 'secondaryButton');
  const imageEl = el(
    p,
    'image',
    cn(
      's-radius border border-[color:var(--site-border-subtle)] w-full object-cover shadow-sm',
      centered ? 'mx-auto mt-8 max-w-5xl' : 'aspect-[4/3]'
    )
  );

  return (
    <Section section={p.section} editing={p.editing}>
      <div
        className={cn('grid items-center gap-12', split && 'lg:grid-cols-2')}
      >
        <div className={cn(centered && 'mx-auto max-w-3xl text-center')}>
          {orderedParts(p, {
            badge: p.badge ? (
              <span className={badgeEl.className} style={badgeEl.style}>
                {p.badge}
              </span>
            ) : null,
            title: p.title ? (
              <h1 className={titleEl.className} style={titleEl.style}>
                {p.title}
              </h1>
            ) : null,
            subtitle: p.subtitle ? (
              <p className={subtitleEl.className} style={subtitleEl.style}>
                {p.subtitle}
              </p>
            ) : null,
            buttons:
              p.primaryButtonText || p.secondaryButtonText ? (
                <div
                  className={cn(
                    'mt-8 flex flex-wrap gap-3',
                    centered && 'justify-center'
                  )}
                >
                  <ButtonLink
                    href={p.primaryButtonLink}
                    className={primaryBtnEl.className}
                    style={primaryBtnEl.style}
                  >
                    {p.primaryButtonText}
                  </ButtonLink>
                  <ButtonLink
                    href={p.secondaryButtonLink}
                    variant="secondary"
                    className={secondaryBtnEl.className}
                    style={secondaryBtnEl.style}
                  >
                    {p.secondaryButtonText}
                  </ButtonLink>
                </div>
              ) : null,
          })}
        </div>
        {p.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imageUrl}
            alt={p.imageAlt ?? ''}
            className={imageEl.className}
            style={imageEl.style}
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
  variant?: 'flat' | 'outline' | 'elevated' | 'glass';
  items: { icon?: string; title: string; description?: string }[];
};

const GRID_COLS = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-2 lg:grid-cols-3',
  4: 'md:grid-cols-2 lg:grid-cols-4',
};

export function Features(p: FeaturesProps) {
  const itemTitleEl = el(p, 'itemTitle', 'text-lg font-semibold');
  const itemDescEl = el(p, 'itemDescription', 's-muted mt-2 leading-relaxed');

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <SectionHeading
        eyebrow={p.eyebrow}
        title={p.title}
        subtitle={p.subtitle}
        partOrder={p.partOrder}
        editing={p.editing}
        props={p}
      />
      <div className={cn('grid gap-6', GRID_COLS[p.columns ?? 3])}>
        {(p.items ?? []).map((item, i) => (
          <MotionItem
            key={i}
            className={cn('p-6 transition-all duration-200', `s-card-${p.variant ?? 'outline'}`)}
          >
            {item.icon && (
              <div className="s-soft-primary s-radius mb-4 inline-flex p-2.5">
                <BlockIcon name={item.icon} className="size-5" />
              </div>
            )}
            <h3 className={itemTitleEl.className} style={itemTitleEl.style}>
              {item.title}
            </h3>
            {item.description && (
              <p className={itemDescEl.className} style={itemDescEl.style}>
                {item.description}
              </p>
            )}
          </MotionItem>
        ))}
      </div>
    </Section>
  );
}

export type StatsProps = WithSection & {
  headline?: string;
  columns?: 2 | 3 | 4;
  items: { value: string; label: string; change?: string }[];
};

const STATS_COLS = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
};

export function Stats(p: StatsProps) {
  const valueEl = el(p, 'value', 's-primary-text text-3xl font-extrabold md:text-4xl');
  const labelEl = el(p, 'label', 'mt-1 text-sm font-medium');
  const headlineEl = p.elements?.heading
    ? el(p, 'heading', 's-muted mb-8 text-center text-sm font-semibold uppercase tracking-wider')
    : el(p, 'headline', 's-muted mb-8 text-center text-sm font-semibold uppercase tracking-wider');

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      {p.headline && (
        <p className={headlineEl.className} style={headlineEl.style}>
          {p.headline}
        </p>
      )}
      <dl className={cn('grid gap-6', STATS_COLS[p.columns ?? 4])}>
        {(p.items ?? []).map((item, i) => (
          <MotionItem key={i} className="flex flex-col text-center">
            {orderedParts(
              { partOrder: p.partOrder, editing: p.editing && i === 0 },
              {
                value: (
                  <dd className={valueEl.className} style={valueEl.style}>
                    {item.value}
                  </dd>
                ),
                label: (
                  <dt className={labelEl.className} style={labelEl.style}>
                    {item.label}
                  </dt>
                ),
                change: item.change ? (
                  <dd className="s-muted mt-1 text-xs">{item.change}</dd>
                ) : null,
              }
            )}
          </MotionItem>
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
  billingPeriod?: string;
  badge?: string;
  description?: string;
  features?: { text: string }[] | string[];
  buttonText?: string;
  buttonLink?: UrlValue;
  popular?: boolean;
};

export type PricingProps = WithSection & {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  showToggle?: boolean;
  variant?: 'flat' | 'outline' | 'elevated' | 'glass';
  plans: PricingPlan[];
};

const featureText = (f: { text: string } | string) =>
  typeof f === 'string' ? f : f.text;

export function Pricing(p: PricingProps) {
  const plans = p.plans ?? [];
  const hasYearly = plans.some(plan => plan.yearlyPrice);
  const planTitleEl = el(p, 'planTitle', 'text-lg font-semibold');
  const planPriceEl = el(p, 'planPrice', 'text-4xl font-extrabold');
  const planBtnEl = el(p, 'planButton');

  const cards = (yearly: boolean) => (
    <div
      className={cn(
        'grid gap-6',
        plans.length >= 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2',
        'items-stretch'
      )}
    >
      {plans.map((plan, i) => (
        <MotionItem
          key={i}
          className={cn(
            'relative flex flex-col p-7 transition-all duration-200',
            `s-card-${p.variant ?? 'outline'}`,
            plan.popular && 'ring-2 ring-[color:var(--site-primary)] shadow-xl'
          )}
        >
          {plan.popular && (
            <span className="s-primary-bg absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold">
              {plan.badge || 'Most popular'}
            </span>
          )}
          <h3 className={planTitleEl.className} style={planTitleEl.style}>
            {plan.name}
          </h3>
          {plan.description && (
            <p className="s-muted mt-1 text-sm">{plan.description}</p>
          )}
          <p className="mt-5 flex items-baseline gap-1">
            <span className={planPriceEl.className} style={planPriceEl.style}>
              {yearly && plan.yearlyPrice ? plan.yearlyPrice : plan.price}
            </span>
            {(plan.billingPeriod || plan.period) && (
              <span className="s-muted text-sm">
                {plan.billingPeriod ||
                  (yearly && plan.yearlyPrice ? 'per year' : plan.period)}
              </span>
            )}
          </p>
          <ul className="mt-6 flex-1 space-y-2.5 text-sm">
            {(plan.features ?? []).map((f, j) => (
              <li key={j} className="flex gap-2">
                <Check
                  className="s-primary-text mt-0.5 size-4 shrink-0"
                  aria-hidden
                />
                {featureText(f)}
              </li>
            ))}
          </ul>
          {plan.buttonText && (
            <div className="mt-7 [&>a]:w-full">
              <ButtonLink
                href={plan.buttonLink}
                variant={plan.popular ? 'primary' : 'secondary'}
                className={planBtnEl.className}
                style={planBtnEl.style}
              >
                {plan.buttonText}
              </ButtonLink>
            </div>
          )}
        </MotionItem>
      ))}
    </div>
  );

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <SectionHeading
        eyebrow={p.eyebrow}
        title={p.title}
        subtitle={p.subtitle}
        partOrder={p.partOrder}
        editing={p.editing}
        props={p}
      />
      {p.showToggle && hasYearly ? (
        <PricingToggle monthly={cards(false)} yearly={cards(true)} />
      ) : (
        cards(false)
      )}
    </Section>
  );
}

export type TestimonialsProps = WithSection & {
  eyebrow?: string;
  title?: string;
  columns?: 1 | 2 | 3;
  variant?: 'flat' | 'outline' | 'elevated' | 'glass';
  items: {
    quote: string;
    author: string;
    role?: string;
    company?: string;
    avatar?: string;
  }[];
};

const TESTIMONIAL_COLS = {
  1: 'max-w-2xl mx-auto grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
};

export function Testimonials(p: TestimonialsProps) {
  const quoteEl = el(p, 'quote', 'flex-1 text-lg leading-relaxed');
  const authorEl = el(p, 'author', 'font-semibold');

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <SectionHeading
        eyebrow={p.eyebrow}
        title={p.title}
        partOrder={p.partOrder}
        editing={p.editing}
        props={p}
      />
      <div className={cn('grid gap-6', TESTIMONIAL_COLS[p.columns ?? 2])}>
        {(p.items ?? []).map((item, i) => (
          <MotionItem
            as="figure"
            key={i}
            className={cn(
              'flex flex-col p-7 transition-all duration-200',
              `s-card-${p.variant ?? 'outline'}`
            )}
          >
            {orderedParts(
              { partOrder: p.partOrder, editing: p.editing && i === 0 },
              {
                quote: (
                  <>
                    <Quote
                      className="s-primary-text mb-4 size-6"
                      aria-hidden
                    />
                    <blockquote
                      className={quoteEl.className}
                      style={quoteEl.style}
                    >
                      “{item.quote}”
                    </blockquote>
                  </>
                ),
                author: (
                  <figcaption className="mt-6 flex items-center gap-3">
                    {item.avatar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.avatar}
                        alt=""
                        className="size-11 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className={authorEl.className} style={authorEl.style}>
                        {item.author}
                      </p>
                      {(item.role || item.company) && (
                        <p className="s-muted text-sm">
                          {[item.role, item.company]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                  </figcaption>
                ),
              }
            )}
          </MotionItem>
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
  const questionEl = el(p, 'question', 'flex cursor-pointer list-none items-center justify-between gap-4 font-semibold');
  const answerEl = el(p, 'answer', 's-muted mt-3 leading-relaxed');

  return (
    <Section
      section={p.section}
      editing={p.editing}
      innerClassName="max-w-3xl"
      hasItems
    >
      <SectionHeading
        eyebrow={p.eyebrow}
        title={p.title}
        partOrder={p.partOrder}
        editing={p.editing}
        props={p}
      />
      <div className="s-border divide-y divide-[color:var(--site-border)] border-y">
        {(p.items ?? []).map((item, i) => (
          <MotionItem
            as="details"
            key={i}
            className="group py-5"
            open={p.editing && i === 0}
          >
            <summary className={questionEl.className} style={questionEl.style}>
              {item.question}
              <span
                className="s-muted text-xl transition group-open:rotate-45"
                aria-hidden
              >
                +
              </span>
            </summary>
            <p className={answerEl.className} style={answerEl.style}>
              {item.answer}
            </p>
          </MotionItem>
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
  primaryButtonLink?: UrlValue;
  secondaryButtonText?: string;
  secondaryButtonLink?: UrlValue;
  variant?: 'gradient' | 'primary' | 'subtle';
};

export function Cta(p: CtaProps) {
  const variant = p.variant ?? 'gradient';
  const onColor = variant !== 'subtle';
  const badgeEl = el(
    p,
    'badge',
    cn(
      'mb-5 inline-flex rounded-full px-3.5 py-1 text-xs font-semibold uppercase tracking-wider',
      onColor ? 'bg-white/20 text-white' : 's-soft-primary'
    )
  );
  const titleEl = el(
    p,
    'title',
    's-type-h2 mx-auto max-w-2xl tracking-tight text-balance'
  );
  const descEl = el(
    p,
    'description',
    cn(
      's-type-body mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-pretty',
      onColor ? 'text-white/85' : 's-muted'
    )
  );
  const primaryBtnEl = el(p, 'primaryButton');
  const secondaryBtnEl = el(p, 'secondaryButton');

  return (
    <Section section={p.section} editing={p.editing}>
      <div
        className={cn(
          's-radius px-8 py-14 text-center md:px-16 md:py-20 transition-all duration-200',
          variant === 'gradient' && 's-gradient border border-[color:var(--site-border-subtle)]',
          variant === 'primary' && 's-primary-bg',
          variant === 'subtle' && 's-card-outline'
        )}
      >
        {orderedParts(p, {
          badge: p.badge ? (
            <span className={badgeEl.className} style={badgeEl.style}>
              {p.badge}
            </span>
          ) : null,
          title: p.title ? (
            <h2 className={titleEl.className} style={titleEl.style}>
              {p.title}
            </h2>
          ) : null,
          description: p.description ? (
            <p className={descEl.className} style={descEl.style}>
              {p.description}
            </p>
          ) : null,
          buttons:
            p.primaryButtonText || p.secondaryButtonText ? (
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <ButtonLink
                  href={p.primaryButtonLink}
                  variant={onColor ? 'light' : 'primary'}
                  className={primaryBtnEl.className}
                  style={primaryBtnEl.style}
                >
                  {p.primaryButtonText}
                </ButtonLink>
                <ButtonLink
                  href={p.secondaryButtonLink}
                  variant={onColor ? 'ghost-light' : 'secondary'}
                  className={secondaryBtnEl.className}
                  style={secondaryBtnEl.style}
                >
                  {p.secondaryButtonText}
                </ButtonLink>
              </div>
            ) : null,
        })}
      </div>
    </Section>
  );
}

/* =========================================================================
   LOGO CLOUD
   ========================================================================= */

export type LogoCloudItem = {
  url?: string;
  alt?: string;
  link?: UrlValue;
};

export type LogoCloudProps = WithSection & {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  items?: LogoCloudItem[];
};

export function LogoCloud(p: LogoCloudProps) {
  const items = (p.items ?? []).filter(i => i.url);

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <SectionHeading
        eyebrow={p.eyebrow}
        title={p.title}
        subtitle={p.subtitle}
        align="center"
        partOrder={p.partOrder}
        editing={p.editing}
        props={p}
      />
      <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
        {items.map((item, i) => (
          <MotionItem key={i} as="div" className="flex items-center justify-center">
            {item.link ? (
              <a
                {...resolveLinkProps(item.link)}
                className="flex items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.alt ?? ''}
                  className="max-h-8 w-auto opacity-70 grayscale transition-all duration-200 hover:opacity-100 hover:grayscale-0"
                />
              </a>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.url}
                alt={item.alt ?? ''}
                className="max-h-8 w-auto opacity-70 grayscale transition-all duration-200 hover:opacity-100 hover:grayscale-0"
              />
            )}
          </MotionItem>
        ))}
      </div>
    </Section>
  );
}

/* =========================================================================
   TEAM
   ========================================================================= */

export type TeamItem = {
  photo?: string;
  name?: string;
  role?: string;
};

export type TeamProps = WithSection & {
  eyebrow?: string;
  title?: string;
  items?: TeamItem[];
  columns?: 2 | 3 | 4;
  variant?: 'flat' | 'outline' | 'elevated' | 'glass';
};

const TEAM_COLS = {
  2: 'grid gap-6 sm:grid-cols-2',
  3: 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid gap-6 sm:grid-cols-2 lg:grid-cols-4',
};

export function Team(p: TeamProps) {
  const items = p.items ?? [];

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <SectionHeading
        eyebrow={p.eyebrow}
        title={p.title}
        partOrder={p.partOrder}
        editing={p.editing}
        props={p}
      />
      {items.length ? (
        <div className={TEAM_COLS[p.columns ?? 3]}>
          {items.map((item, i) => (
            <MotionItem
              key={i}
              as="div"
              className={cn(
                'p-6 text-center transition-all duration-200',
                `s-card-${p.variant ?? 'outline'}`
              )}
            >
              {item.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.photo}
                  alt={item.name ?? ''}
                  className="s-radius mx-auto size-20 object-cover"
                />
              ) : null}
              {item.name ? (
                <p className="mt-3 font-semibold">{item.name}</p>
              ) : null}
              {item.role ? (
                <p className="s-muted mt-1 text-sm">{item.role}</p>
              ) : null}
            </MotionItem>
          ))}
        </div>
      ) : (
        p.editing ? (
          <div className="s-surface s-border s-muted s-radius flex aspect-[16/9] items-center justify-center border border-dashed text-sm">
            Add team members in the sidebar
          </div>
        ) : null
      )}
    </Section>
  );
}

/* =========================================================================
   TIMELINE
   ========================================================================= */

export type TimelineItem = {
  date?: string;
  title?: string;
  body?: string;
};

export type TimelineProps = WithSection & {
  eyebrow?: string;
  title?: string;
  items?: TimelineItem[];
};

export function Timeline(p: TimelineProps) {
  const items = p.items ?? [];

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <SectionHeading
        eyebrow={p.eyebrow}
        title={p.title}
        partOrder={p.partOrder}
        editing={p.editing}
        props={p}
      />
      {items.length ? (
        <ol className="relative space-y-8 border-l border-[color:var(--site-border)] pl-8">
          {items.map((item, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[37px] size-3 rounded-full bg-[color:var(--site-primary)]" />
              {item.date ? (
                <p className="s-primary-text text-sm font-semibold">{item.date}</p>
              ) : null}
              {item.title ? (
                <h3 className="text-lg font-semibold">{item.title}</h3>
              ) : null}
              {item.body ? (
                <p className="s-muted mt-1 leading-relaxed">{item.body}</p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        p.editing ? (
          <div className="s-surface s-border s-muted s-radius flex aspect-[16/9] items-center justify-center border border-dashed text-sm">
            Add timeline entries in the sidebar
          </div>
        ) : null
      )}
    </Section>
  );
}
