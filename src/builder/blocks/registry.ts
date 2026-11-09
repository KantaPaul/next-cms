import { VideoLibrary } from '@/components/video/video-library';
import { customComponents } from '../custom';
import { Example } from '../custom/example';

import { Divider, Heading, OverlayClose } from './overlay';
import { BlogPosts } from './blog';
import {
  Icon,
  IconBox,
  ImageBox,
  ProgressBar,
  StarRating,
} from './basic';
import { Counter } from './counter-client';
import { Countdown } from './countdown-client';
import { FlipBox } from './flip-box';
import { AnimatedHeadline } from './animated-headline-client';
import { TableOfContents } from './toc-client';
import { Breadcrumbs } from './breadcrumbs';
import { Hotspot } from './hotspot-client';
import { Lottie } from './lottie-client';
import {
  Code,
  CollectionItem,
  Column,
  Columns,
  ContactForm,
  Embed,
  Gallery,
  GlobalRef,
  ImageBlock,
  RichText,
  Video,
} from './content';
import { CollectionBlockRef } from './collection-block';
import { MegaMenuCard } from './mega-menu';
import { Container } from './container';
import { ImageMorph } from './image-morph';
import { LightboxImage } from './lightbox-client';
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
  PriceList,
  Stats,
  Team,
  Testimonials,
  TestimonialCarousel,
  Timeline,
} from './marketing';
import { Newsletter } from './newsletter';
import { Audio } from './audio';
import { BookmarksDrawer } from './bookmarks-client';
import { PostTypeEntries } from './post-type-entries';
import { QueryFilter } from './query-filters';
import { LoopGrid } from './loop-grid';
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

export const builtInComponents = {
  Hero,
  Features,
  Stats,
  Pricing,
  Testimonials,
  FAQ: Faq,
  CTA: Cta,
  Column,
  Columns,
  Container,
  RichText,
  Image: ImageBlock,
  Gallery,
  CollectionItem,
  CollectionBlock: CollectionBlockRef,
  MegaMenuCard,
  PostTypeEntries,
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
  Audio,
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
  Bookmarks: BookmarksDrawer,
  LanguageSwitcher: LanguageSwitcherBlock,
  QueryLoop,
  LoopGrid,
  LoopItemField,
  QueryFilter,
  SearchResults,
  OverlayClose,
  LightboxImage,
  Heading,
  Divider,
  Icon,
  IconBox,
  ImageBox,
  Counter,
  ProgressBar,
  StarRating,
  Countdown,
  FlipBox,
  AnimatedHeadline,
  PriceList,
  TableOfContents,
  Breadcrumbs,
  TestimonialCarousel,
  Hotspot,
  Lottie,
};

export const getBlockComponents = () => ({
  ...builtInComponents,
  ...customComponents,
});

export type BlockType = keyof ReturnType<typeof getBlockComponents>;
