'use client';

import { createElement, type ComponentType } from 'react';
import { BackgroundControl } from '../background';
import { BorderControl } from '../border';
import { FilterControl } from '../filter';
import { ShadowControl } from '../shadow';
import { TypographyControl } from '../typography';
import { GroupShell } from './shell';
import { TextShadowControl } from './text-shadow';
import { TextStrokeControl } from './text-stroke';
import { ImageSizeControl } from './image-size';

export type GroupKind =
  | 'typography'
  | 'textStroke'
  | 'textShadow'
  | 'boxShadow'
  | 'border'
  | 'background'
  | 'imageSize'
  | 'cssFilter';

export interface GroupProps<T = any> {
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  exclude?: string[];
  defaults?: Partial<T>;
  state?: 'normal' | 'hover';
}

export const GROUP_CONTROLS: Record<GroupKind, ComponentType<GroupProps<any>>> = {
  typography: TypographyControl as unknown as ComponentType<GroupProps<any>>,
  textStroke: TextStrokeControl as unknown as ComponentType<GroupProps<any>>,
  textShadow: TextShadowControl as unknown as ComponentType<GroupProps<any>>,
  boxShadow: ((props: any) => createElement(ShadowControl, { ...props, hideLabel: true })) as unknown as ComponentType<GroupProps<any>>,
  border: BorderControl as unknown as ComponentType<GroupProps<any>>,
  background: BackgroundControl as unknown as ComponentType<GroupProps<any>>,
  imageSize: ImageSizeControl as unknown as ComponentType<GroupProps<any>>,
  cssFilter: FilterControl as unknown as ComponentType<GroupProps<any>>,
};

export {
  GroupShell,
  TextStrokeControl,
  TextShadowControl,
  ImageSizeControl,
};
export type { GroupShellProps } from './shell';
