import { type Metadata } from 'next';
import { type OpenGraph } from 'next/dist/lib/metadata/types/opengraph-types';

type MetaObjectParams = {
  title?: string;
  openGraph?: OpenGraph;
  description?: string;
};

export const metaObject = (
  titleOrParams?: string | MetaObjectParams,
  openGraph?: OpenGraph,
  description?: string
): Metadata => {
  let title: string | undefined;
  let og: OpenGraph | undefined;
  let desc: string | undefined;

  if (typeof titleOrParams === 'object') {
    // Object argument style
    title = titleOrParams.title;
    og = titleOrParams.openGraph;
    desc = titleOrParams.description;
  } else {
    // Individual arguments style
    title = titleOrParams;
    og = openGraph;
    desc = description;
  }

  const siteName = "Next CMS";
  const siteTitle =
    process.env?.NODE_ENV === 'production'
      ? title
        ? `${title} - ${siteName}`
        : siteName
      : `💻 ⚙️  ${title}`;
  const finalDescription = desc || 'Sometimes less is more';

  return {
    title: siteTitle,
    description: finalDescription,
    openGraph: og ?? {
      title: siteTitle,
      description: finalDescription,
      url: process.env.NEXT_PUBLIC_BASE_URL,
      siteName, // https://developers.google.com/search/docs/appearance/site-names
      // will update later
      // images: {
      //   url: 'https://s3.amazonaws.com/redqteam.com/isomorphic-furyroad/itemdep/isobanner.png',
      //   width: 1200,
      //   height: 630,
      // },
      locale: 'en_US',
      type: 'website',
    },
  };
};
