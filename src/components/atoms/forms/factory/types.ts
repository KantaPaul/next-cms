import type { DropzoneOptions } from 'react-dropzone';
import type { DefaultValues, FieldValues, Path } from 'react-hook-form';
import type { Option } from '@/components/atoms/react-select';
import type { methods } from '@/components/atoms/forms/factory/methods';

// Footer cell interface for field arrays
export interface FooterCell {
  render: React.ReactNode;
  className?: string;
}

// Type for divider names like 'divider', 'divider1', 'divider2', etc.
type ExtraNames = 'empty' | 'divider' | `divider${number}` | `empty${number}`;

// Update the main FormFieldDef type to include conditional fields
export type FormFieldDef<TFieldValues extends FieldValues> = {
  type: keyof typeof methods | 'fieldArray' | 'fieldArrayInput' | 'conditional' | 'calculation'; // Added 'conditional'
  name: Path<TFieldValues> | ExtraNames;
  label?: React.ReactNode;
  header?: React.ReactNode;
  size?: number;
  options?: Option[];
  isRequired?: boolean;
  isLoading?: boolean;
  isClearable?: boolean;
  disabled?: boolean;
  placeholder?: string;
  description?: string;
  className?: string;
  inputProps?: Record<string, unknown>;
  accept?: DropzoneOptions['accept'];
  defaultValues?: DefaultValues<TFieldValues>;
  fields?: FormFieldDef<TFieldValues>[];
  callback?: (value: any, index: number, rowData?: any) => void;
  disableColumnRepeat?: boolean;
  headerClassName?: string;
  showYearPicker?: boolean;
  multiple?: boolean;
  maxSize?: number;
  minDate?: Date;
  maxDate?: Date;
  dateFormat?: string;
  // NEW: Add conditional field properties
  conditions?: ConditionalCondition<TFieldValues>[];
  defaultField?: FormFieldDef<TFieldValues>[]; // Also an array now
  // NEW: Simple boolean flags for automatic filtering
  unique?: boolean; // Ensure field value is unique across all rows
  // For calculation type - no name needed since it doesn't render
  calculations?: (row: any, index: number, setValue: any, fieldArrayName: string) => void;
  prefix?: string;
  // Footer support for field arrays
  footer?: (data: TFieldValues[]) => FooterCell[];
  disableDelete?: boolean;
  deleteDisabledMessage?: string;
};

// NEW: Add conditional condition interface
export interface ConditionalCondition<TFieldValues extends FieldValues> {
  when: (rowValue: any, index: number) => boolean;
  field: FormFieldDef<TFieldValues>[]; // Always an array - no single field option
}
