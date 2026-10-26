import { toast } from 'sonner';

import { MESSAGES } from '@/config/messages';

import { handleServerError } from './error';

export { cn } from '@/lib/utils/cn';
// import { uploadSingleFile } from './s3/upload-single';

// Export the new export data processor utilities
export {
  type ExportDataProcessorOptions,
  type ProcessedExportData,
  processDataForCsvExport,
  processDataForExcelExport,
  processDataForExport,
  processDataWithVisibilityFilter,
} from '@/lib/utils/export-data-processor';

export function isFileArray(files: unknown): files is File[] {
  const isArray = Array.isArray(files);
  if (!isArray) return false;
  return true;
}

export function bytesToSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / 1024 ** i)} ${sizes[i]}`;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

export function isFile(file: unknown): file is File {
  return file instanceof File;
}

export function copyToClipboard(text: string, message: string): void {
  navigator.clipboard.writeText(text).then(
    () => {
      toast.success(message);
    },
    err => {
      toast.error(MESSAGES.FAILED_TO_COPY_PLEASE_TRY_AGAIN);
    }
  );
}

export const stringToBoolean = (value: any) => {
  // check if the value is undefined or null
  if (value === undefined || value === null) {
    return false;
  }

  // check if the value is a boolean
  if (typeof value === 'boolean') {
    return value;
  }

  switch (value.toLowerCase().trim()) {
    case 'true':
    case 'yes':
    case '1':
      return true;
    case 'false':
    case 'no':
    case '0':
    case null:
      return false;
    default:
      return Boolean(value);
  }
};

export const isFileName = (name: string) => {
  return name.match(/^[a-zA-Z0-9-_]+$/);
};

export const isStringContainsImageType = (name: string) => {
  const match = name.match(/\.(jpeg|jpg|gif|png|webp)$/);

  return match ? true : false;
};

// export async function uploadFile(fieldName: string, inputs: any) {
//   try {
//     if (Array.isArray(inputs[fieldName])) {
//       const image = await uploadSingleFile(inputs[fieldName][0]);
//       inputs[fieldName] = image;
//     }

//     return inputs;
//   } catch (error) {
//     return handleServerError(error);
//   }
// }

export const excludeKeysFromObject = <T extends Record<string, any>>(
  keysToExclude: Array<keyof T>,
  object: T
): Partial<T> => {
  const filteredObject: Partial<T> = {};

  for (const key in object) {
    if (!keysToExclude.includes(key as keyof T)) {
      filteredObject[key] = object[key];
    }
  }

  return filteredObject;
};

export type TSelectOption = {
  label: string;
  value: string;
};

/**
 * Creates an array of select options from a list of items.
 *
 * @example
 * // Single label key
 * const users = [{ id: '1', name: 'John' }];
 * createOptions(users, 'name', 'id');
 * // => [{ label: 'John', value: '1' }]
 *
 * @example
 * // Multiple label keys
 * const users = [{ id: '1', firstName: 'John', lastName: 'Doe' }];
 * createOptions(users, ['firstName', 'lastName'], 'id');
 * // => [{ label: 'John Doe', value: '1' }]
 */
export function createOptions<T>(
  items: T[],
  labelKeys: keyof T | (keyof T)[],
  valueKey: keyof T,
  labelSeparator = ' '
) {
  return items.map(item => {
    const label = Array.isArray(labelKeys)
      ? labelKeys.map(key => item[key]).join(labelSeparator)
      : String(item[labelKeys]);

    return {
      label,
      value: String(item[valueKey]),
    };
  });
}
