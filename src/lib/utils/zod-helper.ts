import { z } from 'zod';
import { MESSAGES } from '@/config/messages';

/**
 * Configuration options for number/currency validation
 * @property {number} min - Minimum allowed value
 * @property {number} max - Maximum allowed value
 * @property {boolean} isDecimal - Allow decimal numbers (default: false)
 * @property {boolean} allowNegative - Allow negative numbers (default: false)
 * @property {boolean} isCurrency - Handle input as currency value (default: false)
 */
type NumberValidationOptions = {
  min?: number;
  max?: number;
  isDecimal?: boolean;
  allowNegative?: boolean;
  isCurrency?: boolean;
  isRequired?: boolean;
};

/**
 * Creates a Zod validator for number and currency input fields
 * Handles both direct number inputs and currency-formatted strings
 *
 * @param fieldName - Name of the field for error messages
 * @param options - Validation configuration options
 * @returns A Zod schema that validates and ensures number type
 *
 * @example
 * // Required currency field with min/max
 * price: numberValidation('Price', { isCurrency: true, min: 0, max: 1000 })
 *
 * // Optional integer field
 * quantity: numberValidation('Quantity', { min: 0 }).nullish()
 */
export function numberValidation(
  fieldName: string,
  options: NumberValidationOptions = {}
) {
  let baseSchema: z.ZodType<number>;

  const numberSchema = options.isRequired
    ? z.number({ error: MESSAGES.IS_REQUIRED(fieldName) })
    : z.number();

  if (options.isCurrency) {
    baseSchema = z.preprocess(
      val => (typeof val === 'string' ? Number(val) : val),
      numberSchema
        .refine(val => options.min === undefined || val >= options.min, {
          message: `${fieldName} must be at least ${options.min}`,
        })
        .refine(val => options.max === undefined || val <= options.max, {
          message: `${fieldName} Cannot Exceed ${options.max}`,
        })
    );
  } else {
    baseSchema = z.preprocess(
      val => (typeof val === 'string' ? Number(val) : val),
      numberSchema
        .refine(val => options.allowNegative || val >= 0, {
          message: `${fieldName} Cannot be Negative`,
        })
        .refine(val => options.isDecimal || Number.isInteger(val), {
          error: MESSAGES.INTEGER_ONLY,
        })
        .refine(val => options.min === undefined || val >= options.min, {
          message: `${fieldName} must be at least ${options.min}`,
        })
        .refine(val => options.max === undefined || val <= options.max, {
          message: `${fieldName} Cannot Exceed ${options.max}`,
        })
    );
  }

  return baseSchema;
}

export function dateValidation(fieldName: string) {
  return z
    .union([
      z.string().min(1, { error: MESSAGES.IS_REQUIRED(fieldName) }),
      z.date(),
      z.null(),
    ])
    .refine(val => val !== null, {
      error: MESSAGES.IS_REQUIRED(fieldName),
    })
    .refine(
      val => {
        if (typeof val === 'string') {
          return !isNaN(Date.parse(val));
        }

        return val instanceof Date && !isNaN(val.getTime());
      },
      {
        error: MESSAGES.IS_INVALID(fieldName),
      }
    )
    .transform(val => (typeof val === 'string' ? new Date(val) : val));
}

export const stringRequired = (name: string, min = 1) =>
  z
    .string({
      error: MESSAGES.IS_REQUIRED(name),
    })
    .min(min, { error: MESSAGES.IS_REQUIRED(name) });

export const dateRequired = (name: string) =>
  z
    .any()
    .refine(val => val !== null && val !== undefined, {
      error: MESSAGES.IS_REQUIRED(name),
    })
    .refine(val => val instanceof Date && !isNaN(val.getTime()), {
      error: MESSAGES.IS_INVALID(name),
    })
    .transform(val => new Date(val));

export function numberRequired(message: string) {
  return z.number({
    error: MESSAGES.IS_REQUIRED(message),
  });
}

export const handleNumber = (name: string) =>
  z.number().transform((value, ctx) => {
    if (isNaN(Number(value))) {
      return ctx.addIssue({
        code: 'custom',
        error: MESSAGES.IS_INVALID(name),
      });
    }

    if (Number(value) < 1) {
      return ctx.addIssue({
        code: 'custom',
        error: MESSAGES.IS_REQUIRED(name),
      });
    }

    return Number(value);
  });

export const OptionSchema = (
  isRequired = false,
  customMessages?: { label?: string; value?: string }
) =>
  z.object({
    label: isRequired
      ? z.string().min(1, {
          message: customMessages?.label || MESSAGES.IS_REQUIRED('Label'),
        })
      : z.string().optional(),
    value: isRequired
      ? z.string().min(1, {
          message: customMessages?.value || MESSAGES.IS_REQUIRED('Value'),
        })
      : z.string().optional(),
  });

export const zipCodeSchema = z
  .string()
  .min(1, { message: 'ZIP code is required.' }) // Check for non-empty input
  .regex(/^\d{5}(-\d{4})?$/, {
    message:
      'Invalid ZIP code format. Please enter a 5-digit or 9-digit ZIP code.',
  });

export function enumValidation<T extends readonly [string, ...string[]]>(
  enumValues: T,
  {
    name,
  }: {
    name: string;
  }
) {
  const schema = z.enum(enumValues, {
    error: MESSAGES.IS_INVALID(name),
  });

  return schema;
}

export function emailValidation(fieldName: string, isRequired?: boolean) {
  let schema = z.string();

  if (isRequired) {
    schema = schema.min(1, { message: MESSAGES.IS_REQUIRED(fieldName) });
  }

  // Apply email validation
  schema = schema.regex(z.regexes.email, {
    message: MESSAGES.INVALID_EMAIL_ADDRESS,
  });

  // If not required, allow empty strings
  if (!isRequired) {
    return z.union([schema, z.literal('')]);
  }

  return schema;
}

export function urlValidation(fieldName: string, isRequired?: boolean) {
  // Regex that matches both domain names and full URLs with http/https
  const urlRegex =
    /^(https?:\/\/)?([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)?$/;

  if (isRequired) {
    // Required: must be non-empty and valid URL
    return z
      .string()
      .min(1, { message: MESSAGES.IS_REQUIRED(fieldName) })
      .regex(urlRegex, {
        message: MESSAGES.IS_INVALID(fieldName),
      });
  }

  // Optional: can be empty string OR valid URL
  return z.union([
    z.literal(''),
    z.string().regex(urlRegex, {
      message: MESSAGES.IS_INVALID(fieldName),
    }),
  ]);
}
