/**
 * Native blocks (ported from Puck config).
 */

import { defineBlock } from '@nextcms/builder-core';
import { z } from 'zod';
import { Hero, Features, Stats, Pricing, Testimonials, Faq, Cta, LogoCloud, Team, Timeline } from '../blocks/marketing';
import { Columns, Video, Embed, Code, RichText, ImageBlock, Gallery, ContactForm, CollectionItem, GlobalRef } from '../blocks/content';
import { Container } from '../blocks/container';
import { VideoLibraryBlock } from '@/components/video/video-library';
import { Map as MapBlock } from '../blocks/map';
import { Newsletter } from '../blocks/newsletter';
import { ImageMorph } from '../blocks/image-morph';
import { Button, Spacer } from '../blocks/layout';
import { BlogPosts, PostTitle, PostFeaturedImage, PostMeta, PostContent, RelatedPosts } from '../blocks/blog';
import { Slider, Tabs, Accordion } from '../blocks/interactive';
import { Example } from '../custom/example';
import { ContainerLayoutControl } from '../controls/container-layout';
import { ImageMorphField } from '../controls/image-morph';
import { PageTransitionField } from '../controls/page-transition';
import { SectionField } from '../controls/section-inspector';
import { ContactFormOptionsField } from '../fields/contact-form-options-field';
import { CategoryLockField, TagLockField, GlobalBlockSelectField, IconPickerField, MediaUrlField, RichTextField, UrlField } from '../fields/client-fields';
import { CONTENT, STYLE, mediaField, sectionField, sectionSchema, urlField, urlSchema, iconField } from './fields';
import { DEFAULT_SECTION } from '../blocks/section';
import { DEFAULT_CONTAINER } from '../blocks/container';
import { DEFAULT_SECTION as _DS } from '../blocks/section';

export const exampleBlock = defineBlock({
  type: "example",
  label: "Example",
  category: "layout",
  icon: "example",
  schema: z.object({}),
  render: Example,
  fields: { heading: { label: "Heading", group: CONTENT, type: 'text' }, body: { label: "Body", group: CONTENT, type: 'textarea' }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"heading":"Example block","body":"A local plugin renders here. Remove the example to add your own.","section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const HeroBlock = defineBlock({
  type: "Hero",
  label: "Hero",
  category: "heroes",
  icon: "hero",
  inlineProps: ['title', 'subtitle'],
  schema: z.object({}),
  render: Hero,
  fields: { badge: { label: "Badge", group: CONTENT, type: 'text' }, title: { label: "Headline", group: CONTENT, type: 'textarea' }, subtitle: { label: "Subheadline", group: CONTENT, type: 'textarea' }, primaryButtonText: { label: "Primary button text", group: CONTENT, type: 'text' }, primaryButtonLink: { label: "Primary button link", group: CONTENT, type: 'custom', render: UrlField }, secondaryButtonText: { label: "Secondary button text", group: CONTENT, type: 'text' }, secondaryButtonLink: { label: "Secondary button link", group: CONTENT, type: 'custom', render: UrlField }, imageUrl: { label: "Image", group: CONTENT, type: 'custom', render: MediaUrlField }, imageAlt: { label: "Image alt text", group: CONTENT, type: 'text', when: (props: any) => !!props.imageUrl }, alignment: { label: "Alignment", group: CONTENT, type: 'radio', options: [{"label":"Center","value":"center"},{"label":"Left","value":"left"}] }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"badge":"New","title":"A headline that explains what you do","subtitle":"One or two sentences that describe the value for your visitors.","primaryButtonText":"Get started","primaryButtonLink":"#","secondaryButtonText":"Learn more","secondaryButtonLink":"#","imageUrl":"","imageAlt":"","alignment":"center","section":{"paddingY":"lg","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const FeaturesBlock = defineBlock({
  type: "Features",
  label: "Feature grid",
  category: "marketing",
  icon: "features",
  schema: z.object({}),
  render: Features,
  fields: { eyebrow: { label: "Eyebrow", group: CONTENT, type: 'text' }, title: { label: "Title", group: CONTENT, type: 'text' }, subtitle: { label: "Subtitle", group: CONTENT, type: 'textarea' }, columns: { label: "Columns", group: CONTENT, type: 'select', options: [{"label":"2","value":2},{"label":"3","value":3},{"label":"4","value":4}] }, items: { label: "Features", group: CONTENT, type: 'list', item: { icon: { label: "Icon", group: CONTENT, type: 'custom', render: IconPickerField }, title: { label: "Title", group: CONTENT, type: 'text' }, description: { label: "Description", group: CONTENT, type: 'textarea' } }, defaultItem: {"icon":"Sparkles","title":"Feature","description":"Describe the benefit."} }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"eyebrow":"Features","title":"Everything you need","subtitle":"","columns":3,"items":[{"icon":"Zap","title":"Fast","description":"Pages render at the edge in milliseconds."},{"icon":"ShieldCheck","title":"Secure","description":"Role-based access and audit logs built in."},{"icon":"Layers","title":"Flexible","description":"Visual builder and rich text in one place."}],"section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const StatsBlock = defineBlock({
  type: "Stats",
  label: "Stats",
  category: "marketing",
  icon: "stats",
  schema: z.object({}),
  render: Stats,
  fields: { headline: { label: "Headline", group: CONTENT, type: 'text' }, items: { label: "Stats", group: CONTENT, type: 'list', item: { value: { label: "Value", group: CONTENT, type: 'text' }, label: { label: "Label", group: CONTENT, type: 'text' }, change: { label: "Note", group: CONTENT, type: 'text' } }, defaultItem: {"value":"99%","label":"Label","change":""} }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"headline":"Trusted by teams everywhere","items":[{"value":"10k+","label":"Customers","change":""},{"value":"99.9%","label":"Uptime","change":""},{"value":"45ms","label":"Median response","change":""},{"value":"4.9/5","label":"Rating","change":""}],"section":{"paddingY":"sm","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const PricingBlock = defineBlock({
  type: "Pricing",
  label: "Pricing table",
  category: "marketing",
  icon: "pricing",
  schema: z.object({}),
  render: Pricing,
  fields: { eyebrow: { label: "Eyebrow", group: CONTENT, type: 'text' }, title: { label: "Title", group: CONTENT, type: 'text' }, subtitle: { label: "Subtitle", group: CONTENT, type: 'textarea' }, showToggle: { label: "Monthly / yearly toggle", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, plans: { label: "Plans", group: CONTENT, type: 'list', item: { name: { label: "Name", group: CONTENT, type: 'text' }, price: { label: "Monthly price", group: CONTENT, type: 'text' }, yearlyPrice: { label: "Yearly price (optional)", group: CONTENT, type: 'text' }, period: { label: "Period label", group: CONTENT, type: 'text' }, description: { label: "Description", group: CONTENT, type: 'textarea' }, features: { label: "Features", group: CONTENT, type: 'list', item: { text: { label: "Feature", group: CONTENT, type: 'text' } } }, buttonText: { label: "Button text", group: CONTENT, type: 'text' }, buttonLink: { label: "Button link", group: CONTENT, type: 'custom', render: UrlField }, popular: { label: "Highlight as popular", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] } }, defaultItem: {"name":"Plan","price":"$0","yearlyPrice":"","period":"per month","description":"","features":[{"text":"Feature"}],"buttonText":"Choose plan","buttonLink":"#","popular":false} }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"eyebrow":"Pricing","title":"Simple, transparent pricing","subtitle":"","showToggle":false,"plans":[{"name":"Starter","price":"$0","period":"forever","description":"For side projects.","features":[{"text":"1 site"},{"text":"Community support"}],"buttonText":"Start free","buttonLink":"#","popular":false},{"name":"Pro","price":"$29","period":"per month","description":"For growing teams.","features":[{"text":"Unlimited sites"},{"text":"Priority support"}],"buttonText":"Start trial","buttonLink":"#","popular":true},{"name":"Enterprise","price":"Custom","period":"","description":"For large organisations.","features":[{"text":"SSO"},{"text":"SLA"}],"buttonText":"Contact sales","buttonLink":"#","popular":false}],"section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const TestimonialsBlock = defineBlock({
  type: "Testimonials",
  label: "Testimonials",
  category: "marketing",
  icon: "testimonials",
  schema: z.object({}),
  render: Testimonials,
  fields: { eyebrow: { label: "Eyebrow", group: CONTENT, type: 'text' }, title: { label: "Title", group: CONTENT, type: 'text' }, items: { label: "Testimonials", group: CONTENT, type: 'list', item: { quote: { label: "Quote", group: CONTENT, type: 'textarea' }, author: { label: "Author", group: CONTENT, type: 'text' }, role: { label: "Role", group: CONTENT, type: 'text' }, company: { label: "Company", group: CONTENT, type: 'text' }, avatar: { label: "Avatar", group: CONTENT, type: 'custom', render: MediaUrlField } }, defaultItem: {"quote":"A great product.","author":"Name","role":"","company":"","avatar":""} }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"eyebrow":"Testimonials","title":"Loved by our customers","items":[{"quote":"It changed how our team ships pages.","author":"Alex Kim","role":"Head of Marketing","company":"Acme","avatar":""},{"quote":"The editor is a joy to use.","author":"Sam Lee","role":"Designer","company":"Globex","avatar":""}],"section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const FAQBlock = defineBlock({
  type: "FAQ",
  label: "FAQ",
  category: "marketing",
  icon: "faq",
  schema: z.object({}),
  render: Faq,
  fields: { eyebrow: { label: "Eyebrow", group: CONTENT, type: 'text' }, title: { label: "Title", group: CONTENT, type: 'text' }, items: { label: "Questions", group: CONTENT, type: 'list', item: { question: { label: "Question", group: CONTENT, type: 'text' }, answer: { label: "Answer", group: CONTENT, type: 'textarea' } }, defaultItem: {"question":"Question?","answer":"Answer."} }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"eyebrow":"FAQ","title":"Frequently asked questions","items":[{"question":"How do I get started?","answer":"Sign up and create your first page in minutes."},{"question":"Can I cancel anytime?","answer":"Yes, there are no long-term contracts."}],"section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const CTABlock = defineBlock({
  type: "CTA",
  label: "Call to action",
  category: "heroes",
  icon: "cta",
  schema: z.object({}),
  render: Cta,
  fields: { badge: { label: "Badge", group: CONTENT, type: 'text' }, title: { label: "Title", group: CONTENT, type: 'textarea' }, description: { label: "Description", group: CONTENT, type: 'textarea' }, primaryButtonText: { label: "Primary button text", group: CONTENT, type: 'text' }, primaryButtonLink: { label: "Primary button link", group: CONTENT, type: 'custom', render: UrlField }, secondaryButtonText: { label: "Secondary button text", group: CONTENT, type: 'text' }, secondaryButtonLink: { label: "Secondary button link", group: CONTENT, type: 'custom', render: UrlField }, variant: { label: "Style", group: CONTENT, type: 'select', options: [{"label":"Gradient","value":"gradient"},{"label":"Primary color","value":"primary"},{"label":"Subtle","value":"subtle"}] }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"badge":"","title":"Ready to get started?","description":"Join thousands of teams building faster.","primaryButtonText":"Start now","primaryButtonLink":"#","secondaryButtonText":"","secondaryButtonLink":"","variant":"gradient","section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const ColumnsBlock = defineBlock({
  type: "Columns",
  label: "Columns",
  category: "layout",
  icon: "columns",
  schema: z.object({}),
  render: Columns,
  fields: { layout: { label: "Layout", group: CONTENT, type: 'select', options: [{"label":"2 equal","value":"1-1"},{"label":"3 equal","value":"1-1-1"},{"label":"4 equal","value":"1-1-1-1"},{"label":"Wide + narrow","value":"2-1"},{"label":"Narrow + wide","value":"1-2"}] }, gap: { label: "Gap", group: CONTENT, type: 'select', options: [{"label":"Small","value":"sm"},{"label":"Medium","value":"md"},{"label":"Large","value":"lg"}] }, verticalAlign: { label: "Vertical alignment", group: CONTENT, type: 'select', options: [{"label":"Top","value":"start"},{"label":"Center","value":"center"},{"label":"Bottom","value":"end"}] }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"layout":"1-1","gap":"md","verticalAlign":"start","column1":[],"column2":[],"column3":[],"column4":[],"section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
  slots: { column1: { allow: undefined, disallow: ["Columns","GlobalRef"] }, column2: { allow: undefined, disallow: ["Columns","GlobalRef"] }, column3: { allow: undefined, disallow: ["Columns","GlobalRef"] }, column4: { allow: undefined, disallow: ["Columns","GlobalRef"] } },
});

export const ContainerBlock = defineBlock({
  type: "Container",
  label: "Container",
  category: "layout",
  icon: "container",
  schema: z.object({}),
  render: Container,
  fields: { container: { label: "Container", group: CONTENT, type: 'custom', render: ContainerLayoutControl }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"container":{"mode":"flex","tag":"div","direction":{"desktop":"row"},"wrap":{"desktop":"nowrap"},"justify":{"desktop":"start"},"alignItems":{"desktop":"stretch"},"alignContent":{"desktop":"start"},"boxSizing":"border-box"},"section":{"paddingY":"none","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""},"content":[]},
  slots: { content: { allow: undefined, disallow: undefined } },
});

export const VideoBlock = defineBlock({
  type: "Video",
  label: "Video",
  category: "content",
  icon: "video",
  schema: z.object({}),
  render: Video,
  fields: { url: { label: "Video URL", group: CONTENT, type: 'text' }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"url":"","section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const VideoLibraryNativeBlock = defineBlock({
  type: "VideoLibrary",
  label: "Video library",
  category: "content",
  icon: "videolibrary",
  schema: z.object({}),
  render: VideoLibraryBlock,
  fields: { title: { label: "Title", group: CONTENT, type: 'text' }, description: { label: "Description", group: CONTENT, type: 'textarea' }, layout: { label: "Layout", group: CONTENT, type: 'select', options: [{"label":"Sidebar","value":"sidebar"},{"label":"Stacked","value":"stacked"}] }, playlistId: { label: "Playlist ID (optional)", group: CONTENT, type: 'text' }, pageSize: { label: "Videos per page", group: CONTENT, type: 'number', min: 1, max: 48 }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"title":"Videos","description":"","layout":"sidebar","playlistId":"","pageSize":12,"section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const EmbedBlock = defineBlock({
  type: "Embed",
  label: "Embed",
  category: "content",
  icon: "embed",
  schema: z.object({}),
  render: Embed,
  fields: { url: { label: "Embed URL", group: CONTENT, type: 'text' }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"url":"","section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const MapNativeBlock = defineBlock({
  type: "Map",
  label: "Map",
  category: "content",
  icon: "map",
  schema: z.object({}),
  render: MapBlock,
  fields: { address: { label: "Address", group: CONTENT, type: 'text' }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"address":"","section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const CodeBlock = defineBlock({
  type: "Code",
  label: "Code",
  category: "content",
  icon: "code",
  schema: z.object({}),
  render: Code,
  fields: { code: { label: "Code", group: CONTENT, type: 'textarea' }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"code":"","section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const NewsletterBlock = defineBlock({
  type: "Newsletter",
  label: "Newsletter",
  category: "content",
  icon: "newsletter",
  schema: z.object({}),
  render: Newsletter,
  fields: { title: { label: "Title", group: CONTENT, type: 'text' }, subtitle: { label: "Short text", group: CONTENT, type: 'text' }, email: { label: "Email", group: CONTENT, type: 'text' }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"title":"Newsletter","subtitle":"","email":"","section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const ImageMorphBlock = defineBlock({
  type: "ImageMorph",
  label: "Image morph",
  category: "layout",
  icon: "imagemorph",
  schema: z.object({}),
  render: ImageMorph,
  fields: { morph: { label: "Morph", group: CONTENT, type: 'custom', render: ImageMorphField }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"morph":{"effect":"image","image":{"url":"","opacity":1,"zoom":1,"posX":50,"posY":50},"shape":{"type":"default"},"timing":{"easing":"ease-in-out","direction":"normal","loop":false,"duration":0.6,"delay":0,"endDelay":0}},"section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const RichTextBlock = defineBlock({
  type: "RichText",
  label: "Rich text",
  category: "content",
  icon: "richtext",
  schema: z.object({}),
  render: RichText,
  fields: { content: { label: "Content", group: CONTENT, type: 'custom', render: RichTextField }, width: { label: "Width", group: CONTENT, type: 'select', options: [{"label":"Narrow","value":"narrow"},{"label":"Normal","value":"normal"},{"label":"Wide","value":"wide"}] }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"content":"<h2>Section heading</h2><p>Write your content here.</p>","width":"normal","section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const ImageNativeBlock = defineBlock({
  type: "Image",
  label: "Image",
  category: "content",
  icon: "image",
  schema: z.object({}),
  render: ImageBlock,
  fields: { url: { label: "Image", group: CONTENT, type: 'custom', render: MediaUrlField }, alt: { label: "Alt text", group: CONTENT, type: 'text' }, caption: { label: "Caption", group: CONTENT, type: 'text' }, aspect: { label: "Aspect ratio", group: CONTENT, type: 'select', options: [{"label":"Original","value":"auto"},{"label":"16:9","value":"video"},{"label":"Square","value":"square"},{"label":"21:9","value":"wide"}] }, width: { label: "Width", group: CONTENT, type: 'select', options: [{"label":"Normal","value":"normal"},{"label":"Wide","value":"wide"},{"label":"Full","value":"full"}] }, imageWidth: { label: "Image width (px)", group: CONTENT, type: 'number', min: 0, max: 4000 }, imageHeight: { label: "Image height (px)", group: CONTENT, type: 'number', min: 0, max: 4000 }, objectFit: { label: "Object fit", group: CONTENT, type: 'select', options: [{"label":"Cover","value":"cover"},{"label":"Contain","value":"contain"},{"label":"Fill","value":"fill"}] }, link: { label: "Link (optional)", group: CONTENT, type: 'custom', render: UrlField }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"url":"","alt":"","caption":"","aspect":"auto","width":"normal","objectFit":"cover","link":"","section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const GalleryBlock = defineBlock({
  type: "Gallery",
  label: "Gallery",
  category: "content",
  icon: "gallery",
  schema: z.object({}),
  render: Gallery,
  fields: { eyebrow: { label: "Eyebrow", group: CONTENT, type: 'text' }, title: { label: "Title", group: CONTENT, type: 'text' }, subtitle: { label: "Subtitle", group: CONTENT, type: 'textarea' }, columns: { label: "Columns", group: CONTENT, type: 'select', options: [{"label":"2","value":2},{"label":"3","value":3},{"label":"4","value":4}] }, gap: { label: "Gap", group: CONTENT, type: 'select', options: [{"label":"Small","value":"sm"},{"label":"Medium","value":"md"},{"label":"Large","value":"lg"}] }, items: { label: "Images", group: CONTENT, type: 'list', item: { url: { label: "Image", group: CONTENT, type: 'custom', render: MediaUrlField }, alt: { label: "Alt text", group: CONTENT, type: 'text' }, caption: { label: "Caption", group: CONTENT, type: 'text' } }, defaultItem: {"url":"","alt":"","caption":""} }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"eyebrow":"","title":"Gallery","subtitle":"","columns":3,"gap":"md","items":[{"url":"","alt":"","caption":""},{"url":"","alt":"","caption":""},{"url":"","alt":"","caption":""}],"section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const ContactFormBlock = defineBlock({
  type: "ContactForm",
  label: "Contact form",
  category: "contact",
  icon: "contactform",
  schema: z.object({}),
  render: ContactForm,
  fields: { title: { label: "Title", group: CONTENT, type: 'text' }, subtitle: { label: "Subtitle", group: CONTENT, type: 'textarea' }, submitText: { label: "Submit button", group: CONTENT, type: 'text' }, successMessage: { label: "Success message", group: CONTENT, type: 'text' }, actionUrl: { label: "Form action URL (optional)", group: CONTENT, type: 'text' }, fields: { label: "Fields", group: CONTENT, type: 'list', item: { label: { label: "Label", group: CONTENT, type: 'text' }, name: { label: "Name", group: CONTENT, type: 'text' }, type: { label: "Type", group: CONTENT, type: 'select', options: [{"label":"Text","value":"text"},{"label":"Email","value":"email"},{"label":"Phone","value":"tel"},{"label":"Textarea","value":"textarea"},{"label":"Number","value":"number"},{"label":"Date","value":"date"},{"label":"URL","value":"url"},{"label":"Dropdown","value":"select"},{"label":"Radio","value":"radio"},{"label":"Checkbox","value":"checkbox"}] }, placeholder: { label: "Placeholder", group: CONTENT, type: 'text' }, options: { label: "Options, one per line", group: CONTENT, type: 'custom', render: ContactFormOptionsField }, required: { label: "Required", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] } }, defaultItem: {"label":"Field","name":"field","type":"text","required":false,"placeholder":"","options":""} }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"title":"Contact us","subtitle":"","submitText":"Send message","successMessage":"Thanks! We will be in touch soon.","actionUrl":"","fields":[{"label":"Name","name":"name","type":"text","required":true},{"label":"Email","name":"email","type":"email","required":true},{"label":"Message","name":"message","type":"textarea","required":true}],"section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const ButtonBlock = defineBlock({
  type: "Button",
  label: "Button",
  category: "layout",
  icon: "button",
  inlineProps: ['label'],
  schema: z.object({}),
  render: Button,
  fields: { label: { label: "Label", group: CONTENT, type: 'text' }, link: { label: "Link", group: CONTENT, type: 'custom', render: UrlField }, alignment: { label: "Alignment", group: CONTENT, type: 'radio', options: [{"label":"Center","value":"center"},{"label":"Left","value":"left"}] }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"label":"","link":"","alignment":"center","section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const SpacerBlock = defineBlock({
  type: "Spacer",
  label: "Spacer",
  category: "layout",
  icon: "spacer",
  schema: z.object({}),
  render: Spacer,
  fields: { height: { label: "Height (px)", group: CONTENT, type: 'number', min: 0, max: 400 }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"height":96,"section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const CollectionItemBlock = defineBlock({
  type: "CollectionItem",
  label: "Collection item",
  category: "collections",
  icon: "collectionitem",
  schema: z.object({}),
  render: CollectionItem,
  fields: { field: { label: "Field key (optional)", group: CONTENT, type: 'text' }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"field":"","section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const GlobalRefBlock = defineBlock({
  type: "GlobalRef",
  label: "Global block",
  category: "global",
  icon: "globalref",
  schema: z.object({}),
  render: GlobalRef,
  fields: { globalBlockId: { label: "Block", group: CONTENT, type: 'custom', render: GlobalBlockSelectField } },
  defaults: {"globalBlockId":""},
});

export const LogoCloudBlock = defineBlock({
  type: "LogoCloud",
  label: "Logo cloud",
  category: "marketing",
  icon: "logocloud",
  schema: z.object({}),
  render: LogoCloud,
  fields: { eyebrow: { label: "Eyebrow", group: CONTENT, type: 'text' }, title: { label: "Title", group: CONTENT, type: 'text' }, subtitle: { label: "Subtitle", group: CONTENT, type: 'textarea' }, items: { label: "Logos", group: CONTENT, type: 'list', item: { url: { label: "Logo", group: CONTENT, type: 'custom', render: MediaUrlField }, alt: { label: "Alt text", group: CONTENT, type: 'text' }, link: { label: "Link (optional)", group: CONTENT, type: 'custom', render: UrlField } }, defaultItem: {"url":"","alt":"","link":""} }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"eyebrow":"","title":"Trusted by teams","subtitle":"","items":[],"section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const TeamBlock = defineBlock({
  type: "Team",
  label: "Team",
  category: "marketing",
  icon: "team",
  schema: z.object({}),
  render: Team,
  fields: { eyebrow: { label: "Eyebrow", group: CONTENT, type: 'text' }, title: { label: "Title", group: CONTENT, type: 'text' }, items: { label: "Members", group: CONTENT, type: 'list', item: { photo: { label: "Photo", group: CONTENT, type: 'custom', render: MediaUrlField }, name: { label: "Name", group: CONTENT, type: 'text' }, role: { label: "Role", group: CONTENT, type: 'text' } }, defaultItem: {"photo":"","name":"","role":""} }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"eyebrow":"","title":"Meet the team","items":[],"section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const TimelineBlock = defineBlock({
  type: "Timeline",
  label: "Timeline",
  category: "marketing",
  icon: "timeline",
  schema: z.object({}),
  render: Timeline,
  fields: { eyebrow: { label: "Eyebrow", group: CONTENT, type: 'text' }, title: { label: "Title", group: CONTENT, type: 'text' }, items: { label: "Events", group: CONTENT, type: 'list', item: { date: { label: "Date", group: CONTENT, type: 'text' }, title: { label: "Title", group: CONTENT, type: 'text' }, body: { label: "Body", group: CONTENT, type: 'textarea' } }, defaultItem: {"date":"","title":"","body":""} }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"eyebrow":"","title":"Timeline","items":[],"section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const BlogPostsBlock = defineBlock({
  type: "BlogPosts",
  label: "Blog posts",
  category: "blog",
  icon: "blogposts",
  schema: z.object({}),
  render: BlogPosts,
  fields: { title: { label: "Title", group: CONTENT, type: 'text' }, subtitle: { label: "Subtitle", group: CONTENT, type: 'textarea' }, layout: { label: "Layout", group: CONTENT, type: 'select', options: [{"label":"Grid","value":"grid"},{"label":"List","value":"list"}] }, columns: { label: "Columns", group: CONTENT, type: 'select', options: [{"label":"2","value":2},{"label":"3","value":3},{"label":"4","value":4}] }, pageSize: { label: "Posts per page", group: CONTENT, type: 'number', min: 1, max: 48 }, showSearch: { label: "Search", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, showCategoryFilter: { label: "Category filter", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, showTagFilter: { label: "Tag filter", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, showSort: { label: "Sort", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, showPagination: { label: "Pagination", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, showImage: { label: "Card image", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, showExcerpt: { label: "Card excerpt", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, showAuthor: { label: "Card author", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, showDate: { label: "Card date", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, lockedCategory: { label: "Category lock", group: CONTENT, type: 'custom', render: CategoryLockField }, lockedTag: { label: "Tag lock", group: CONTENT, type: 'custom', render: TagLockField }, emptyMessage: { label: "Empty message", group: CONTENT, type: 'text' }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"title":"Latest posts","subtitle":"","layout":"grid","columns":3,"pageSize":9,"showSearch":true,"showCategoryFilter":true,"showTagFilter":true,"showSort":true,"showPagination":true,"showImage":true,"showExcerpt":true,"showAuthor":true,"showDate":true,"emptyMessage":"","section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const SliderBlock = defineBlock({
  type: "Slider",
  label: "Slider",
  category: "layout",
  icon: "slider",
  schema: z.object({}),
  render: Slider,
  fields: { items: { label: "Slides", group: CONTENT, type: 'list', item: { title: { label: "Title", group: CONTENT, type: 'text' } }, defaultItem: {"title":"Slide","content":[]} }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"items":[{"title":"Slide 1","content":[]}],"section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
  arraySlots: { items: { content: { allow: undefined, disallow: undefined } } },
});

export const TabsBlock = defineBlock({
  type: "Tabs",
  label: "Tabs",
  category: "layout",
  icon: "tabs",
  schema: z.object({}),
  render: Tabs,
  fields: { items: { label: "Tabs", group: CONTENT, type: 'list', item: { label: { label: "Label", group: CONTENT, type: 'text' } }, defaultItem: {"label":"Tab 1","content":[]} }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"items":[{"label":"Tab 1","content":[]}],"section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
  arraySlots: { items: { content: { allow: undefined, disallow: undefined } } },
});

export const AccordionBlock = defineBlock({
  type: "Accordion",
  label: "Accordion",
  category: "layout",
  icon: "accordion",
  schema: z.object({}),
  render: Accordion,
  fields: { items: { label: "Items", group: CONTENT, type: 'list', item: { title: { label: "Title", group: CONTENT, type: 'text' } }, defaultItem: {"title":"Question?","content":[]} }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"items":[{"title":"Item 1","content":[]}],"section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
  arraySlots: { items: { content: { allow: undefined, disallow: undefined } } },
});

export const PostTitleBlock = defineBlock({
  type: "PostTitle",
  label: "Post title",
  category: "post",
  icon: "posttitle",
  schema: z.object({}),
  render: PostTitle,
  fields: { showBackLink: { label: "Link back to the blog page", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, showExcerpt: { label: "Show excerpt", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, alignment: { label: "Alignment", group: CONTENT, type: 'radio', options: [{"label":"Center","value":"center"},{"label":"Left","value":"left"}] }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"showBackLink":true,"showExcerpt":true,"alignment":"left","section":{"paddingY":"sm","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const PostFeaturedImageBlock = defineBlock({
  type: "PostFeaturedImage",
  label: "Featured image",
  category: "post",
  icon: "postfeaturedimage",
  schema: z.object({}),
  render: PostFeaturedImage,
  fields: { aspect: { label: "Aspect ratio", group: CONTENT, type: 'select', options: [{"label":"Wide (21:9)","value":"wide"},{"label":"Video (16:9)","value":"video"},{"label":"Square","value":"square"},{"label":"Original","value":"auto"}] }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"aspect":"wide","section":{"paddingY":"sm","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const PostMetaBlock = defineBlock({
  type: "PostMeta",
  label: "Post details",
  category: "post",
  icon: "postmeta",
  schema: z.object({}),
  render: PostMeta,
  fields: { showAuthor: { label: "Author", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, showDate: { label: "Date", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, showCategories: { label: "Categories", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, showTags: { label: "Tags", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"showAuthor":true,"showDate":true,"showCategories":true,"showTags":true,"section":{"paddingY":"sm","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const PostContentBlock = defineBlock({
  type: "PostContent",
  label: "Post content",
  category: "post",
  icon: "postcontent",
  schema: z.object({}),
  render: PostContent,
  fields: { width: { label: "Width", group: CONTENT, type: 'select', options: [{"label":"Narrow","value":"narrow"},{"label":"Normal","value":"normal"},{"label":"Wide","value":"wide"}] }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"width":"normal","section":{"paddingY":"sm","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const RelatedPostsBlock = defineBlock({
  type: "RelatedPosts",
  label: "Related posts",
  category: "post",
  icon: "relatedposts",
  schema: z.object({}),
  render: RelatedPosts,
  fields: { title: { label: "Title", group: CONTENT, type: 'text' }, limit: { label: "Number of posts", group: CONTENT, type: 'number', min: 1, max: 12 }, columns: { label: "Columns", group: CONTENT, type: 'select', options: [{"label":"2","value":2},{"label":"3","value":3},{"label":"4","value":4}] }, showImage: { label: "Card image", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, showExcerpt: { label: "Card excerpt", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, showAuthor: { label: "Card author", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, showDate: { label: "Card date", group: CONTENT, type: 'radio', options: [{"label":"Yes","value":true},{"label":"No","value":false}] }, section: { label: "Section", group: STYLE, type: 'custom', render: SectionField } },
  defaults: {"title":"Related posts","limit":3,"columns":3,"showImage":true,"showExcerpt":true,"showAuthor":false,"showDate":true,"section":{"paddingY":"md","background":"default","hideOnMobile":false,"hideOnTablet":false,"hideOnDesktop":false,"anchor":""}},
});

export const NATIVE_BLOCKS = [exampleBlock, HeroBlock, FeaturesBlock, StatsBlock, PricingBlock, TestimonialsBlock, FAQBlock, CTABlock, ColumnsBlock, ContainerBlock, VideoBlock, VideoLibraryNativeBlock, EmbedBlock, MapNativeBlock, CodeBlock, NewsletterBlock, ImageMorphBlock, RichTextBlock, ImageNativeBlock, GalleryBlock, ContactFormBlock, ButtonBlock, SpacerBlock, CollectionItemBlock, GlobalRefBlock, LogoCloudBlock, TeamBlock, TimelineBlock, BlogPostsBlock, SliderBlock, TabsBlock, AccordionBlock, PostTitleBlock, PostFeaturedImageBlock, PostMetaBlock, PostContentBlock, RelatedPostsBlock];
export const PAGE_ROOT_FIELDS = {
  maxWidth: {
    type: 'select',
    label: 'Content width',
    group: 'Page',
    options: [
      { label: 'Narrow (768px)', value: 'md' },
      { label: 'Medium (1024px)', value: 'lg' },
      { label: 'Wide (1152px)', value: 'xl' },
      { label: 'Full width', value: 'full' },
    ],
  },
  theme: {
    type: 'select',
    label: 'Color mode',
    group: 'Page',
    options: [
      { label: 'Follow site settings', value: 'site' },
      { label: 'Light', value: 'light' },
      { label: 'Dark', value: 'dark' },
    ],
  },
  paddingY: {
    type: 'select',
    label: 'Page padding',
    group: 'Page',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
    ],
  },
  pageTransition: { type: 'custom', label: 'Page transition', group: 'Page', render: PageTransitionField },
} as any;

export const CATEGORIES = {
  heroes: { title: 'Heroes & calls to action', components: ['Hero', 'CTA'] },
  marketing: {
    title: 'Marketing',
    components: ['Features', 'Stats', 'Pricing', 'Testimonials', 'FAQ', 'LogoCloud', 'Team', 'Timeline'],
  },
  content: {
    title: 'Content',
    components: ['RichText', 'Image', 'Gallery', 'Video', 'VideoLibrary', 'Embed', 'Map', 'Code', 'Newsletter'],
  },
  contact: { title: 'Contact form', components: ['ContactForm'] },
  blog: { title: 'Blog', components: ['BlogPosts'] },
  layout: {
    title: 'Layout',
    components: ['Container', 'Columns', 'Slider', 'Tabs', 'Accordion', 'Button', 'Spacer'],
  },
  collections: { title: 'Collections', components: ['CollectionItem'] },
  global: { title: 'Global blocks', components: ['GlobalRef'] },
  custom: { title: 'Custom', components: ['example'] },
  post: { title: 'Post', components: ['PostTitle', 'PostFeaturedImage', 'PostMeta', 'PostContent', 'RelatedPosts'] },
} as any;
