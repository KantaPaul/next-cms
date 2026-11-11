import { Check, Quote } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { BlockIcon } from '../icons';
import { resolveLinkProps, type UrlValue } from '../style';
import { el, orderedParts, type WithSection } from './element';
import { ItemSlider } from './item-slider-client';
import { OverlayTrigger } from './overlay-trigger';
import { PricingToggle } from './pricing-toggle';
import {
  ButtonLink,
  type CardStyleProps,
  cardClass,
  ITEM_GRID_COLS,
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
    's-soft-primary mb-6 inline-flex rounded-full px-3 py-1 text-xs font-semibold'
  );
  const titleEl = el(p, 'title', 's-display-title');
  const subtitleEl = el(
    p,
    'subtitle',
    's-muted mt-6 text-lg leading-relaxed s-tab-text-xl'
  );
  const primaryBtnEl = el(p, 'primaryButton');
  const secondaryBtnEl = el(p, 'secondaryButton');
  const imageEl = el(
    p,
    'image',
    cn(
      's-radius s-border w-full border object-cover shadow-xl',
      centered ? 'mx-auto mt-4 max-w-5xl' : 'aspect-[4/3]'
    )
  );

  return (
    <Section section={p.section} editing={p.editing}>
      <div
        className={cn('grid items-center gap-12', split && 's-desk-cols-2')}
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

export type FeatureItem = {
  icon?: string;
  title: string;
  description?: string;
  popupTrigger?: boolean;
  overlayId?: string;
};

export type FeaturesProps = WithSection &
  CardStyleProps & {
    showIcons?: boolean;
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    columns?: 2 | 3 | 4;
    items: FeatureItem[];
  };

const GRID_COLS = {
  2: 's-tab-cols-2',
  3: 's-tab-cols-2 s-desk-cols-3',
  4: 's-tab-cols-2 s-desk-cols-4',
};

export function Features(p: FeaturesProps) {
  const itemTitleEl = el(p, 'itemTitle', 'text-lg font-semibold');
  const itemDescEl = el(p, 'itemDescription', 's-muted mt-2 leading-relaxed');
  const iconEl = el(
    p,
    'icon',
    's-soft-primary s-radius mb-4 inline-flex p-2.5'
  );

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <SectionHeading
        elements={p.elements}
        eyebrow={p.eyebrow}
        title={p.title}
        subtitle={p.subtitle}
        partOrder={p.partOrder}
        editing={p.editing}
      />
      <div className={cn('grid gap-6', GRID_COLS[p.columns ?? 3])}>
        {(p.items ?? []).map((item, i) => {
          const cardEl = el(
            p,
            'card',
            cn(cardClass(p), p.cardVariant === 'none' ? 'py-2' : 'p-6')
          );
          return (
            <MotionItem
              key={i}
              className={cardEl.className}
              style={cardEl.style}
            >
              <OverlayTrigger
                overlayId={item.popupTrigger ? item.overlayId : undefined}
                className="block h-full w-full"
              >
                {item.icon && p.showIcons !== false && (
                  <div className={iconEl.className} style={iconEl.style}>
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
              </OverlayTrigger>
            </MotionItem>
          );
        })}
      </div>
    </Section>
  );
}

export type StatsProps = WithSection & {
  headline?: string;
  columns?: 2 | 3 | 4;
  items: { value: string; label: string; change?: string }[];
};

export function Stats(p: StatsProps) {
  const valueEl = el(
    p,
    'value',
    's-primary-text s-stat-value text-3xl s-tab-text-4xl'
  );
  const labelEl = el(p, 'label', 'mt-1 text-sm font-medium');
  const headlineEl = el(
    p,
    'headline',
    's-muted mb-8 text-center text-sm font-semibold uppercase tracking-wider'
  );
  const changeEl = el(p, 'change', 's-muted mt-1 text-xs');

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      {p.headline && (
        <p className={headlineEl.className} style={headlineEl.style}>
          {p.headline}
        </p>
      )}
      <dl
        className={cn(
          'grid grid-cols-2 gap-6',
          { 2: '', 3: 's-desk-cols-3', 4: 's-desk-cols-4' }[p.columns ?? 4]
        )}
      >
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
                  <dd className={changeEl.className} style={changeEl.style}>
                    {item.change}
                  </dd>
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
  description?: string;
  features?: { text: string }[] | string[];
  buttonText?: string;
  buttonLink?: UrlValue;
  popular?: boolean;
};

export type PricingProps = WithSection &
  CardStyleProps & {
    popularLabel?: string;
    yearlyPeriodLabel?: string;
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    showToggle?: boolean;
    plans: PricingPlan[];
  };

const featureText = (f: { text: string } | string) =>
  typeof f === 'string' ? f : f.text;

export function Pricing(p: PricingProps) {
  const plans = p.plans ?? [];
  const hasYearly = plans.some(plan => plan.yearlyPrice);
  const planTitleEl = el(p, 'planTitle', 'text-lg font-semibold');
  const planPriceEl = el(p, 'planPrice', 's-stat-value text-4xl');
  const planBtnEl = el(p, 'planButton');
  const badgeEl = el(
    p,
    'badge',
    's-primary-bg absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold'
  );
  const descEl = el(p, 'description', 's-muted mt-1 text-sm');
  const periodEl = el(p, 'period', 's-muted text-sm');
  const featureEl = el(p, 'feature', 'flex gap-2');

  const cards = (yearly: boolean) => (
    <div
      className={cn(
        'grid gap-6',
        plans.length >= 3 ? 's-desk-cols-3' : 's-tab-cols-2',
        'items-stretch'
      )}
    >
      {plans.map((plan, i) => {
        const cardEl = el(
          p,
          'card',
          cn(
            's-radius relative flex flex-col border p-7',
            plan.popular
              ? cn(
                  cardClass(p, 's-surface'),
                  'shadow-xl ring-2 ring-[color:var(--site-primary)]'
                )
              : cardClass(p, 's-border s-surface')
          )
        );
        return (
          <MotionItem key={i} className={cardEl.className} style={cardEl.style}>
            {plan.popular && (
              <span className={badgeEl.className} style={badgeEl.style}>
                {p.popularLabel || 'Most popular'}
              </span>
            )}
            <h3 className={planTitleEl.className} style={planTitleEl.style}>
              {plan.name}
            </h3>
            {plan.description && (
              <p className={descEl.className} style={descEl.style}>
                {plan.description}
              </p>
            )}
            <p className="mt-5 flex items-baseline gap-1">
              <span className={planPriceEl.className} style={planPriceEl.style}>
                {yearly && plan.yearlyPrice ? plan.yearlyPrice : plan.price}
              </span>
              {plan.period && (
                <span className={periodEl.className} style={periodEl.style}>
                  {yearly && plan.yearlyPrice
                    ? p.yearlyPeriodLabel || 'per year'
                    : plan.period}
                </span>
              )}
            </p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {(plan.features ?? []).map((f, j) => (
                <li
                  key={j}
                  className={featureEl.className}
                  style={featureEl.style}
                >
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
        );
      })}
    </div>
  );

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <SectionHeading
        elements={p.elements}
        eyebrow={p.eyebrow}
        title={p.title}
        subtitle={p.subtitle}
        partOrder={p.partOrder}
        editing={p.editing}
      />
      {p.showToggle && hasYearly ? (
        <PricingToggle
          elements={p.elements}
          monthly={cards(false)}
          yearly={cards(true)}
        />
      ) : (
        cards(false)
      )}
    </Section>
  );
}

export type TestimonialsItem = {
  quote: string;
  author: string;
  role?: string;
  company?: string;
  avatar?: string;
  popupTrigger?: boolean;
  overlayId?: string;
};

export type TestimonialsProps = WithSection &
  CardStyleProps & {
    columns?: 1 | 2 | 3;
    eyebrow?: string;
    title?: string;
    items: TestimonialsItem[];
    slider?: boolean;
    sliderPerView?: number;
    sliderPerViewTablet?: number;
    sliderPerViewMobile?: number;
    sliderGap?: 'sm' | 'md' | 'lg' | 'small' | 'medium' | 'large';
    sliderAutoplay?: boolean;
    sliderInterval?: number;
    sliderPauseOnHover?: boolean;
    sliderLoop?: boolean;
    sliderArrows?: boolean;
    sliderDots?: boolean;
    sliderEffect?: 'slide' | 'fade' | 'zoom';
    sliderSpeed?: 'fast' | 'normal' | 'slow';
  };

export function Testimonials(p: TestimonialsProps) {
  const quoteEl = el(p, 'quote', 'flex-1 text-lg leading-relaxed');
  const authorEl = el(p, 'author', 'font-semibold');
  const quoteIconEl = el(p, 'quoteIcon', 's-primary-text mb-4 size-6');
  const avatarEl = el(p, 'avatar', 'size-11 rounded-full object-cover');
  const roleEl = el(p, 'role', 's-muted text-sm');

  const renderedItems = (p.items ?? []).map((item, i) => {
    const cardEl = el(p, 'card', cn(cardClass(p), 'flex flex-col p-7 h-full'));
    return (
      <MotionItem
        as="figure"
        key={i}
        className={cardEl.className}
        style={cardEl.style}
      >
        <OverlayTrigger
          overlayId={item.popupTrigger ? item.overlayId : undefined}
          className="flex h-full flex-col"
        >
          {orderedParts(
            { partOrder: p.partOrder, editing: p.editing && i === 0 },
            {
              quote: (
                <>
                  <Quote
                    className={quoteIconEl.className}
                    style={quoteIconEl.style}
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
                      className={avatarEl.className}
                      style={avatarEl.style}
                    />
                  )}
                  <div>
                    <p
                      className={authorEl.className}
                      style={authorEl.style}
                    >
                      {item.author}
                    </p>
                    {(item.role || item.company) && (
                      <p className={roleEl.className} style={roleEl.style}>
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
        </OverlayTrigger>
      </MotionItem>
    );
  });

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <SectionHeading
        elements={p.elements}
        eyebrow={p.eyebrow}
        title={p.title}
      />
      {p.slider ? (
        <ItemSlider
          sliderPerView={p.sliderPerView ?? 2}
          sliderPerViewTablet={p.sliderPerViewTablet ?? 2}
          sliderPerViewMobile={p.sliderPerViewMobile ?? 1}
          sliderGap={p.sliderGap}
          sliderAutoplay={p.sliderAutoplay}
          sliderInterval={p.sliderInterval}
          sliderPauseOnHover={p.sliderPauseOnHover}
          sliderLoop={p.sliderLoop}
          sliderArrows={p.sliderArrows}
          sliderDots={p.sliderDots}
          sliderEffect={p.sliderEffect}
          sliderSpeed={p.sliderSpeed}
          elements={p.elements}
          editing={p.editing}
        >
          {renderedItems}
        </ItemSlider>
      ) : (
        <div className={cn('grid gap-6', ITEM_GRID_COLS[p.columns ?? 2])}>
          {renderedItems}
        </div>
      )}
    </Section>
  );
}

export type FaqProps = WithSection & {
  eyebrow?: string;
  title?: string;
  items: { question: string; answer: string }[];
};

export function Faq(p: FaqProps) {
  const questionEl = el(
    p,
    'question',
    'flex cursor-pointer list-none items-center justify-between gap-4 font-semibold'
  );
  const answerEl = el(p, 'answer', 's-muted mt-3 leading-relaxed');
  const itemEl = el(p, 'item', 'group py-5');
  const iconEl = el(
    p,
    'icon',
    's-muted text-xl transition group-open:rotate-45'
  );

  return (
    <Section
      section={p.section}
      editing={p.editing}
      innerClassName="max-w-3xl"
      hasItems
    >
      <SectionHeading
        elements={p.elements}
        eyebrow={p.eyebrow}
        title={p.title}
        partOrder={p.partOrder}
        editing={p.editing}
      />
      <div className="s-border divide-y divide-[color:var(--site-border)] border-y">
        {(p.items ?? []).map((item, i) => (
          <MotionItem
            as="details"
            key={i}
            className={itemEl.className}
            style={itemEl.style}
            open={p.editing && i === 0}
          >
            <summary className={questionEl.className} style={questionEl.style}>
              {item.question}
              <span
                className={iconEl.className}
                style={iconEl.style}
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
      'mb-5 inline-flex rounded-full px-3 py-1 text-xs font-semibold',
      onColor ? 'bg-white/20 text-white' : 's-soft-primary'
    )
  );
  const titleEl = el(p, 'title', 'mx-auto max-w-2xl s-section-title');
  const descEl = el(
    p,
    'description',
    cn('mx-auto mt-4 max-w-2xl text-lg', onColor ? 'text-white/85' : 's-muted')
  );
  const primaryBtnEl = el(p, 'primaryButton');
  const secondaryBtnEl = el(p, 'secondaryButton');

  return (
    <Section section={p.section} editing={p.editing}>
      <div
        className={cn(
          's-radius px-6 py-14 text-center s-tab-px-16',
          variant === 'gradient' && 's-gradient',
          variant === 'primary' && 's-primary-bg',
          variant === 'subtle' && 's-surface s-border border'
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
  /** Logos in grey until hovered. */
  grayscale?: boolean;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  items?: LogoCloudItem[];
  slider?: boolean;
  sliderPerView?: number;
  sliderPerViewTablet?: number;
  sliderPerViewMobile?: number;
  sliderGap?: 'sm' | 'md' | 'lg' | 'small' | 'medium' | 'large';
  sliderAutoplay?: boolean;
  sliderInterval?: number;
  sliderPauseOnHover?: boolean;
  sliderLoop?: boolean;
  sliderArrows?: boolean;
  sliderDots?: boolean;
  sliderEffect?: 'slide' | 'fade' | 'zoom';
  sliderSpeed?: 'fast' | 'normal' | 'slow';
};

export function LogoCloud(p: LogoCloudProps) {
  const items = (p.items ?? []).filter(i => i.url);
  const logoEl = el(
    p,
    'logo',
    cn(
      's-muted max-h-8 w-auto transition duration-200',
      p.grayscale && 'opacity-70 grayscale hover:opacity-100 hover:grayscale-0'
    )
  );

  const renderedItems = items.map((item, i) => (
    <MotionItem
      key={i}
      as="div"
      className="flex items-center justify-center h-full"
    >
      {item.link ? (
        <a
          {...resolveLinkProps(item.link)}
          className="flex items-center justify-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.url}
            alt={item.alt ?? ''}
            className={logoEl.className}
            style={logoEl.style}
          />
        </a>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt={item.alt ?? ''}
          className={logoEl.className}
          style={logoEl.style}
        />
      )}
    </MotionItem>
  ));

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <SectionHeading
        elements={p.elements}
        eyebrow={p.eyebrow}
        title={p.title}
        subtitle={p.subtitle}
        align="center"
        partOrder={p.partOrder}
        editing={p.editing}
      />
      {p.slider ? (
        <ItemSlider
          sliderPerView={p.sliderPerView ?? 5}
          sliderPerViewTablet={p.sliderPerViewTablet ?? 3}
          sliderPerViewMobile={p.sliderPerViewMobile ?? 2}
          sliderGap={p.sliderGap}
          sliderAutoplay={p.sliderAutoplay}
          sliderInterval={p.sliderInterval}
          sliderPauseOnHover={p.sliderPauseOnHover}
          sliderLoop={p.sliderLoop}
          sliderArrows={p.sliderArrows}
          sliderDots={p.sliderDots}
          sliderEffect={p.sliderEffect}
          sliderSpeed={p.sliderSpeed}
          elements={p.elements}
          editing={p.editing}
        >
          {renderedItems}
        </ItemSlider>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {renderedItems}
        </div>
      )}
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
  popupTrigger?: boolean;
  overlayId?: string;
};

export type TeamProps = WithSection &
  CardStyleProps & {
    columns?: 2 | 3 | 4;
    eyebrow?: string;
    title?: string;
    items?: TeamItem[];
    slider?: boolean;
    sliderPerView?: number;
    sliderPerViewTablet?: number;
    sliderPerViewMobile?: number;
    sliderGap?: 'sm' | 'md' | 'lg' | 'small' | 'medium' | 'large';
    sliderAutoplay?: boolean;
    sliderInterval?: number;
    sliderPauseOnHover?: boolean;
    sliderLoop?: boolean;
    sliderArrows?: boolean;
    sliderDots?: boolean;
    sliderEffect?: 'slide' | 'fade' | 'zoom';
    sliderSpeed?: 'fast' | 'normal' | 'slow';
  };

export function Team(p: TeamProps) {
  const items = p.items ?? [];
  const photoEl = el(p, 'photo', 's-radius mx-auto size-20 object-cover');
  const nameEl = el(p, 'name', 'mt-3 font-semibold');
  const roleEl = el(p, 'role', 's-muted mt-1 text-sm');

  const renderedItems = items.map((item, i) => {
    const cardEl = el(p, 'card', cn(cardClass(p), 'p-6 text-center h-full'));
    return (
      <MotionItem
        key={i}
        as="div"
        className={cardEl.className}
        style={cardEl.style}
      >
        <OverlayTrigger
          overlayId={item.popupTrigger ? item.overlayId : undefined}
          className="block h-full w-full"
        >
          {item.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.photo}
              alt={item.name ?? ''}
              className={photoEl.className}
              style={photoEl.style}
            />
          ) : null}
          {item.name ? (
            <p className={nameEl.className} style={nameEl.style}>
              {item.name}
            </p>
          ) : null}
          {item.role ? (
            <p className={roleEl.className} style={roleEl.style}>
              {item.role}
            </p>
          ) : null}
        </OverlayTrigger>
      </MotionItem>
    );
  });

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <SectionHeading
        elements={p.elements}
        eyebrow={p.eyebrow}
        title={p.title}
        partOrder={p.partOrder}
        editing={p.editing}
      />
      {items.length ? (
        p.slider ? (
          <ItemSlider
            sliderPerView={p.sliderPerView ?? 3}
            sliderPerViewTablet={p.sliderPerViewTablet ?? 2}
            sliderPerViewMobile={p.sliderPerViewMobile ?? 1}
            sliderGap={p.sliderGap}
            sliderAutoplay={p.sliderAutoplay}
            sliderInterval={p.sliderInterval}
            sliderPauseOnHover={p.sliderPauseOnHover}
            sliderLoop={p.sliderLoop}
            sliderArrows={p.sliderArrows}
            sliderDots={p.sliderDots}
            sliderEffect={p.sliderEffect}
            sliderSpeed={p.sliderSpeed}
            elements={p.elements}
            editing={p.editing}
          >
            {renderedItems}
          </ItemSlider>
        ) : (
          <div
            className={cn(
              'grid gap-6 sm:grid-cols-2',
              { 2: '', 3: 's-desk-cols-3', 4: 's-desk-cols-4' }[p.columns ?? 3]
            )}
          >
            {renderedItems}
          </div>
        )
      ) : p.editing ? (
        <div className="s-surface s-border s-muted s-radius flex aspect-[16/9] items-center justify-center border border-dashed text-sm">
          Add team members in the sidebar
        </div>
      ) : null}
    </Section>
  );
}

/* =========================================================================
   Price List Block
   ========================================================================= */

export type PriceListItem = {
  title: string;
  price: string;
  description?: string;
  image?: string;
  link?: UrlValue;
};

export type PriceListProps = WithSection & {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  items: PriceListItem[];
  leaderStyle?: 'dotted' | 'dashed' | 'solid' | 'none';
  imagePosition?: 'left' | 'right';
  columns?: 1 | 2;
};

export function PriceList(p: PriceListProps) {
  const items = p.items ?? [];
  const leader = p.leaderStyle ?? 'dotted';
  const cols = p.columns ?? 1;
  const imgPos = p.imagePosition ?? 'left';

  const itemTitleEl = el(p, 'itemTitle', 'font-semibold text-[var(--site-fg)]');
  const itemPriceEl = el(p, 'itemPrice', 'font-bold s-primary-text shrink-0 font-mono');
  const itemDescEl = el(p, 'itemDescription', 'mt-1 text-sm s-muted');
  const itemImgEl = el(p, 'itemImage', 'size-14 rounded-lg object-cover shrink-0');

  const leaderClasses = {
    dotted: 'border-b border-dotted border-current opacity-40',
    dashed: 'border-b border-dashed border-current opacity-40',
    solid: 'border-b border-solid border-current opacity-30',
    none: 'hidden',
  };

  return (
    <Section section={p.section} editing={p.editing} id={p.id ?? p.nodeId}>
      <SectionHeading
        elements={p.elements}
        eyebrow={p.eyebrow}
        title={p.title}
        subtitle={p.subtitle}
        partOrder={p.partOrder}
        editing={p.editing}
      />
      <div
        className={cn(
          'grid gap-6 s-tab-gap-8 w-full',
          cols === 2 ? 's-tab-cols-2' : 'grid-cols-1 max-w-3xl mx-auto'
        )}
      >
        {items.map((item, i) => {
          const itemNode = (
            <div
              key={i}
              className={cn(
                'flex gap-4 items-start w-full group',
                imgPos === 'right' && 'flex-row-reverse'
              )}
            >
              {item.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt=""
                  className={itemImgEl.className}
                  style={itemImgEl.style}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3">
                  <span className={itemTitleEl.className} style={itemTitleEl.style}>
                    {item.title}
                  </span>
                  <div className={cn('flex-1 min-w-[1rem] -mb-1', leaderClasses[leader])} />
                  <span className={itemPriceEl.className} style={itemPriceEl.style}>
                    {item.price}
                  </span>
                </div>
                {item.description && (
                  <p className={itemDescEl.className} style={itemDescEl.style}>
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          );

          if (item.link) {
            return (
              <a
                key={i}
                href={typeof item.link === 'string' ? item.link : item.link.url}
                className="block hover:opacity-90 transition-opacity"
              >
                {itemNode}
              </a>
            );
          }
          return itemNode;
        })}
      </div>
    </Section>
  );
}

export function TestimonialCarousel(p: TestimonialsProps) {
  return <Testimonials {...p} slider={true} />;
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
  const lineEl = el(
    p,
    'line',
    'relative space-y-8 border-l border-[color:var(--site-border)] pl-8'
  );
  const dotEl = el(
    p,
    'dot',
    'absolute -left-[37px] size-3 rounded-full bg-[color:var(--site-primary)]'
  );
  const dateEl = el(p, 'date', 's-primary-text text-sm font-semibold');
  const titleEl = el(p, 'title', 'text-lg font-semibold');
  const bodyEl = el(p, 'body', 's-muted mt-1 leading-relaxed');

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <SectionHeading
        elements={p.elements}
        eyebrow={p.eyebrow}
        title={p.title}
        partOrder={p.partOrder}
        editing={p.editing}
      />
      {items.length ? (
        <ol className={lineEl.className} style={lineEl.style}>
          {items.map((item, i) => (
            <li key={i} className="relative">
              <span className={dotEl.className} style={dotEl.style} />
              {item.date ? (
                <p className={dateEl.className} style={dateEl.style}>
                  {item.date}
                </p>
              ) : null}
              {item.title ? (
                <h3 className={titleEl.className} style={titleEl.style}>
                  {item.title}
                </h3>
              ) : null}
              {item.body ? (
                <p className={bodyEl.className} style={bodyEl.style}>
                  {item.body}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : p.editing ? (
        <div className="s-surface s-border s-muted s-radius flex aspect-[16/9] items-center justify-center border border-dashed text-sm">
          Add timeline entries in the sidebar
        </div>
      ) : null}
    </Section>
  );
}


