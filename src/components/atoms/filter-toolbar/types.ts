import type { Option } from "@/components/atoms/react-select/types";

export type FilterType =
  | 'select'
  | 'multiselect'
  | 'text'
  | 'datepicker'
  | 'daterange'
  | 'numberRange'
  | 'segment'
  | 'switch';

export type DateRangeType = [Date | null, Date | null];

export type Size = 'sm' | 'md' | 'lg';

export interface SegmentAttribute {
  id: string;
  name: string;
}

export interface Segment {
  id: string;
  name: string;
  active: boolean;
  attributes: SegmentAttribute[];
}

export interface FilterConfig {
  name: string;
  size?: Size;
  label?: string;
  prefix?: React.ReactNode;
  type: FilterType;
  placeholder?: string;
  placeholderText?: string;
  options?: Option[];
  className?: string;
  showLabel?: boolean;
  inlineInput?: boolean;
  placeholderFrom?: string;
  placeholderTo?: string;
  isClearable?: boolean;
  disabled?: boolean;
  isDrawer?: boolean;
  segmentOptions?: Segment[];
}

export interface FilterToolbarProps {
  size?: Size;
  hideClearButton?: boolean;
  className?: string;
  filters: FilterConfig[];
  drawerFilters?: DrawerFiltersProps;
}

export interface DrawerFiltersProps {
  title?: string;
  description?: string;
  filters?: FilterConfig[];
}

export interface FilterHandlers {
  clear: () => void;
  setValue: (value: string | string[]) => void;
  setTextValue: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setDateValue: (date: Date) => void;
  setDateRangeValue: (dates: DateRangeType) => void;
}

export interface BaseFilterProps {
  value: string;
  size?: Size;
  label?: string;
  showLabel?: boolean;
  className?: string;
  placeholder?: string;
  isPending?: boolean;
  handlers: FilterHandlers;
  config: Partial<FilterConfig>;
}
