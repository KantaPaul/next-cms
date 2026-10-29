/**
 * Puck's stored data shape, read and written only by the converter during the
 * move off Puck (R683, R703). Hosts keep their own copy of these types.
 */
export type PuckItem = {
  type: string;
  props: Record<string, unknown> & { id: string };
};

export type PuckData = {
  root: { props?: Record<string, unknown> };
  content: PuckItem[];
  zones?: Record<string, PuckItem[]>;
};
