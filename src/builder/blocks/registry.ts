import { Columns, ContactForm, GlobalRef, ImageBlock, RichText } from './content';
import { Cta, Faq, Features, Hero, Pricing, Stats, Testimonials } from './marketing';

export const getBlockComponents = () => ({
  Hero,
  Features,
  Stats,
  Pricing,
  Testimonials,
  FAQ: Faq,
  CTA: Cta,
  Columns,
  RichText,
  Image: ImageBlock,
  ContactForm,
  GlobalRef,
});

export type BlockType = keyof ReturnType<typeof getBlockComponents>;
