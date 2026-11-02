import { VideoLibrary } from '@/components/video/video-library';
import { customComponents } from '../custom';
import { Example } from '../custom/example';

import { BlogPosts } from './blog';
import {
  Code,
  CollectionItem,
  Columns,
  ContactForm,
  Embed,
  Gallery,
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
import { QueryFilter } from './query-filters';
import { LoopItemField, QueryLoop } from './query-loop';
import { SearchResults } from './search-results';
import {
  HeaderBar,
  HeaderColumns,
  FooterColumns,
  Logo,
  NavMenu,
  Copyright,
  FooterLinks,
  MobileMenu,
  SearchBox,
  AnnouncementBar,
  SocialIcons,
  ContactInfo,
  LegalLinks,
  BackToTop,
  ThemeToggle,
  LanguageSwitcherBlock,
} from './site-chrome';

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
  Gallery,
  CollectionItem,
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
  HeaderBar,
  HeaderColumns,
  FooterColumns,
  Logo,
  NavMenu,
  Copyright,
  FooterLinks,
  MobileMenu,
  SearchBox,
  AnnouncementBar,
  SocialIcons,
  ContactInfo,
  LegalLinks,
  BackToTop,
  ThemeToggle,
  LanguageSwitcher: LanguageSwitcherBlock,
  QueryLoop,
  LoopItemField,
  QueryFilter,
  SearchResults,
};

export const getBlockComponents = () => ({
  ...builtInComponents,
  ...customComponents,
});

export type BlockType = keyof ReturnType<typeof getBlockComponents>;
