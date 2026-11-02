/** One section of a guide topic. `html` is trusted, hand-written markup. */
export type GuideSection = { heading: string; html: string };

export type GuideTopic = {
  /** URL slug of the blog post that carries this topic. */
  slug: string;
  title: string;
  /** Which part of the guide the topic belongs to. */
  group: 'overview' | 'dashboard' | 'site' | 'components';
  /** Dashboard or public path the topic documents, if any. */
  path?: string;
  summary: string;
  sections: GuideSection[];
};
