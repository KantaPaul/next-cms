/**
 * Shared pure form logic for conditional visibility, multi-step navigation,
 * and required field validation (used by both client and server).
 */

export type FormConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'empty'
  | 'not_empty';

export type FormCondition = {
  field: string;
  operator: FormConditionOperator;
  value?: string;
};

export type FormFieldLike = {
  name: string;
  label?: string;
  type: string;
  required?: boolean;
  conditions?: FormCondition[];
  conditionMatch?: 'all' | 'any';
  [key: string]: unknown;
};

export type FormStep<T extends FormFieldLike = FormFieldLike> = {
  title: string;
  fields: T[];
};

function evaluateCondition(
  condition: FormCondition,
  values: Record<string, unknown>
): boolean {
  const raw = values[condition.field];
  const actual = raw === undefined || raw === null ? '' : String(raw).trim();
  const expected =
    condition.value === undefined || condition.value === null
      ? ''
      : String(condition.value).trim();

  switch (condition.operator) {
    case 'equals':
      return actual.toLowerCase() === expected.toLowerCase();
    case 'not_equals':
      return actual.toLowerCase() !== expected.toLowerCase();
    case 'contains':
      return actual.toLowerCase().includes(expected.toLowerCase());
    case 'empty':
      return actual === '';
    case 'not_empty':
      return actual !== '';
    default:
      return true;
  }
}

/** Determines if a field is visible based on other field values. */
export function isFieldVisible(
  field: FormFieldLike,
  values: Record<string, unknown>
): boolean {
  const conditions = field.conditions;
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
    return true;
  }

  const match = field.conditionMatch ?? 'all';
  if (match === 'any') {
    return conditions.some(c => evaluateCondition(c, values));
  }
  return conditions.every(c => evaluateCondition(c, values));
}

/** Splits a flat list of fields into ordered steps using 'step' fields as dividers. */
export function splitSteps<T extends FormFieldLike>(fields: T[]): FormStep<T>[] {
  if (!fields || fields.length === 0) {
    return [{ title: 'Step 1', fields: [] }];
  }

  const hasSteps = fields.some(f => f.type === 'step');
  if (!hasSteps) {
    return [{ title: 'Step 1', fields }];
  }

  const steps: FormStep<T>[] = [];
  let currentStep: FormStep<T> | null = null;

  for (const field of fields) {
    if (field.type === 'step') {
      const title = field.label?.trim() || `Step ${steps.length + 1}`;
      currentStep = { title, fields: [] };
      steps.push(currentStep);
    } else {
      if (!currentStep) {
        currentStep = { title: 'Step 1', fields: [] };
        steps.push(currentStep);
      }
      currentStep.fields.push(field);
    }
  }

  return steps.length > 0 ? steps : [{ title: 'Step 1', fields: [] }];
}

/** Returns fields that are both currently visible and required. */
export function visibleRequiredFields<T extends FormFieldLike>(
  fields: T[],
  values: Record<string, unknown>
): T[] {
  return (fields ?? []).filter(field => {
    if (field.type === 'step') return false;
    const isRequired = field.required === true || field.type === 'acceptance';
    return isRequired && isFieldVisible(field, values);
  });
}
