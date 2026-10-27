import { BlogPosts } from './blog';
import {
  Code,
  Columns,
  ContactForm,
  Embed,
  GlobalRef,
  ImageBlock,
  RichText,
  Video,
} from './content';
import { Map } from './map';
import { Newsletter } from './newsletter';
import { ImageMorph } from './image-morph';
import { Accordion, Slider, Tabs } from './interactive';
import { Button, Spacer } from './layout';
import {
  Cta,
  Faq,
  Features,
  Hero,
  LogoCloud,
  Pricing,
  Stats,
  Team,
  Testimonials,
  Timeline,
} from './marketing';
import { customBlocks } from '../custom';

const builtInComponents = {
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
  Video,
  Embed,
  Code,
  Map,
  Newsletter,
  LogoCloud,
  Team,
  Timeline,
  Spacer,
  Button,
  ImageMorph,
};

export const getBlockComponents = () => ({
  ...builtInComponents,
  ...Object.fromEntries(customBlocks.map(block => [block.key, block.render])),
});

export type BlockType = keyof ReturnType<typeof getBlockComponents>;
