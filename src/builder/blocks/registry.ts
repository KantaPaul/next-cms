import { BlogPosts } from './blog';
import {
  Columns,
  ContactForm,
  GlobalRef,
  ImageBlock,
  RichText,
} from './content';
import { Accordion, Slider, Tabs } from './interactive';
import {
  Cta,
  Faq,
  Features,
  Hero,
  Pricing,
  Stats,
  Testimonials,
} from './marketing';

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
  BlogPosts,
  Slider,
  Tabs,
  Accordion,
});

export type BlockType = keyof ReturnType<typeof getBlockComponents>;
