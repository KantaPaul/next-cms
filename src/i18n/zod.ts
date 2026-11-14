import { z } from 'zod';

export type ValidationTranslator = (
  key: string,
  values?: Record<string, string | number>
) => string;

/**
 * Creates a Zod v4 error map that looks up localized messages under `validation.*`.
 */
export function createZodErrorMap(t: ValidationTranslator): z.ZodErrorMap {
  return (issue) => {
    switch (issue.code) {
      case 'invalid_type':
        if (issue.input === undefined || issue.input === null) {
          return t('required');
        }
        return t('invalidType', { expected: String(issue.expected) });
      case 'too_small':
        if (issue.origin === 'string') {
          if (issue.minimum === 1) return t('required');
          return t('minLength', { min: Number(issue.minimum) });
        }
        if (issue.origin === 'number') {
          return t('minNumber', { min: Number(issue.minimum) });
        }
        return t('tooSmall', { min: Number(issue.minimum) });
      case 'too_big':
        if (issue.origin === 'string') {
          return t('maxLength', { max: Number(issue.maximum) });
        }
        if (issue.origin === 'number') {
          return t('maxNumber', { max: Number(issue.maximum) });
        }
        return t('tooBig', { max: Number(issue.maximum) });
      case 'invalid_format':
        if (issue.format === 'email') return t('invalidEmail');
        if (issue.format === 'url') return t('invalidUrl');
        return t('invalidFormat');
      default:
        return undefined;
    }
  };
}
