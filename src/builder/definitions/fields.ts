/**
 * CMS field helpers and shared schemas for block definitions. Custom fields
 * reuse the CMS controls, which read editor state through the editor bridge,
 * so they work in both editors.
 */

import type { FieldDef } from '@nextcms/builder-core';
import { z } from 'zod';
import type { SectionSettings } from '../blocks/section';
import { SectionField } from '../controls/section-inspector';
import { IconPickerField, MediaUrlField, UrlField } from '../fields/client-fields';
import type { UrlValue } from '../style';

export const CONTENT = 'Content';
export const STYLE = 'Style & layout';

export const urlField = (label: string): FieldDef => ({
  type: 'custom',
  label,
  group: CONTENT,
  render: UrlField,
});

export const mediaField = (label: string): FieldDef => ({
  type: 'custom',
  label,
  group: CONTENT,
  render: MediaUrlField,
});

export const iconField = (label: string): FieldDef => ({
  type: 'custom',
  label,
  group: CONTENT,
  render: IconPickerField,
});

/** Style, layout, and motion settings on every block. */
export const sectionField: FieldDef = {
  type: 'custom',
  label: 'Section',
  group: STYLE,
  render: SectionField,
};

export const ALIGN_OPTIONS = [
  { label: 'Center', value: 'center' },
  { label: 'Left', value: 'left' },
];

/** Section settings are validated by the style system when rendered. */
export const sectionSchema = z.custom<SectionSettings>(
  value => value === undefined || (typeof value === 'object' && value !== null)
);

export const urlSchema = z.custom<UrlValue>(
  value =>
    value === undefined ||
    typeof value === 'string' ||
    (typeof value === 'object' && value !== null)
);
