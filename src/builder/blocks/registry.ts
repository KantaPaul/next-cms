import { VideoLibrary } from '@/components/video/video-library';
import { customBlocks } from '../custom';
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
import { Container } from './container';
import { ImageMorph } from './image-morph';
import { Accordion, Slider, Tabs } from './interactive';
import { Button, Spacer } from './layout';
import { Map as MapBlock } from './map';
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
import { Newsletter } from './newsletter';

const builtInComponents = {
  Hero,
  Features,
  Stats,
  Pricing,
  Testimonials,
  FAQ: Faq,
  CTA: Cta,
  Columns,
  Container,
  RichText,
  Image: ImageBlock,
  ContactForm,
  GlobalRef,
  BlogPosts,
  Slider,
  Tabs,
  Accordion,
  Video,
  VideoLibrary,
  Embed,
  Code,
  Map: MapBlock,
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
