/**
 * Shared pure form logic for conditional visibility, conditional required rules,
 * multi-step navigation, and zero-eval calculated fields (used by client and server).
 */

export type FormConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'empty'
  | 'not_empty'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte';

export type FormCondition = {
  field: string;
  operator: FormConditionOperator;
  value?: string;
};

export type FormConditionAction = 'show' | 'hide' | 'require';

export type FormFieldLike = {
  name: string;
  label?: string;
  type: string;
  required?: boolean;
  conditions?: FormCondition[];
  conditionMatch?: 'all' | 'any';
  conditionAction?: FormConditionAction;
  formula?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
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
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      if (actual === '' || expected === '') return false;
      const aNum = Number(actual);
      const bNum = Number(expected);
      const useNum = Number.isFinite(aNum) && Number.isFinite(bNum);
      if (condition.operator === 'gt') return useNum ? aNum > bNum : actual > expected;
      if (condition.operator === 'gte') return useNum ? aNum >= bNum : actual >= expected;
      if (condition.operator === 'lt') return useNum ? aNum < bNum : actual < expected;
      return useNum ? aNum <= bNum : actual <= expected;
    }
    default:
      return true;
  }
}

function conditionsMatch(
  field: FormFieldLike,
  values: Record<string, unknown>
): boolean | null {
  const conditions = field.conditions;
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
    return null;
  }
  const match = field.conditionMatch ?? 'all';
  return match === 'any'
    ? conditions.some(c => evaluateCondition(c, values))
    : conditions.every(c => evaluateCondition(c, values));
}

/** Determines if a field is visible based on other field values. */
export function isFieldVisible(
  field: FormFieldLike,
  values: Record<string, unknown>
): boolean {
  const matched = conditionsMatch(field, values);
  if (matched === null) return true;
  const action = field.conditionAction ?? 'show';
  if (action === 'hide') return !matched;
  if (action === 'require') return true;
  return matched;
}

/** Determines if a field is made required by conditional rules. */
export function isFieldConditionallyRequired(
  field: FormFieldLike,
  values: Record<string, unknown>
): boolean {
  if ((field.conditionAction ?? 'show') !== 'require') return false;
  return conditionsMatch(field, values) === true;
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

/** Returns indices of steps that have at least one visible field (for conditional step skipping). */
export function getVisibleStepIndices<T extends FormFieldLike>(
  steps: FormStep<T>[],
  values: Record<string, unknown>
): number[] {
  const indices: number[] = [];
  steps.forEach((step, idx) => {
    if (step.fields.some(f => isFieldVisible(f, values))) {
      indices.push(idx);
    }
  });
  return indices.length > 0 ? indices : [0];
}

/** Returns fields that are both currently visible and required. */
export function visibleRequiredFields<T extends FormFieldLike>(
  fields: T[],
  values: Record<string, unknown>
): T[] {
  return (fields ?? []).filter(field => {
    if (field.type === 'step' || field.type === 'calculated') return false;
    const isRequired =
      field.required === true ||
      field.type === 'acceptance' ||
      isFieldConditionallyRequired(field, values);
    return isRequired && isFieldVisible(field, values);
  });
}

// ---------------------------------------------------------------------------
// Zero-eval Arithmetic Formula Evaluator (BLD-302)
// ---------------------------------------------------------------------------

type Token =
  | { type: 'num'; value: number }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: '+' | '-' | '*' | '/' }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'comma' };

function tokenizeFormula(
  formula: string,
  values: Record<string, unknown>
): Token[] | null {
  const substituted = formula.replace(
    /\{([A-Za-z0-9_.-]+)\}/g,
    (_, key: string) => {
      const raw = values[key];
      if (raw === undefined || raw === null || raw === '') return '0';
      const num = Number(String(raw).trim());
      return Number.isFinite(num) ? String(num) : '0';
    }
  );

  const tokens: Token[] = [];
  let i = 0;
  while (i < substituted.length) {
    const ch = substituted[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'comma' });
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      while (i < substituted.length && /[0-9.]/.test(substituted[i])) {
        numStr += substituted[i++];
      }
      const num = Number(numStr);
      if (!Number.isFinite(num)) return null;
      tokens.push({ type: 'num', value: num });
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let ident = '';
      while (i < substituted.length && /[A-Za-z0-9_]/.test(substituted[i])) {
        ident += substituted[i++];
      }
      tokens.push({ type: 'ident', value: ident.toLowerCase() });
      continue;
    }
    return null;
  }
  return tokens;
}

/**
 * Evaluates a safe arithmetic formula containing `{fieldName}` references,
 * `+`, `-`, `*`, `/`, parentheses, and `round()`, `min()`, `max()`.
 */
export function evaluateFormula(
  formula: string | undefined,
  values: Record<string, unknown>,
  decimals = 2
): number | null {
  if (!formula || !formula.trim()) return null;
  const tokens = tokenizeFormula(formula, values);
  if (!tokens || tokens.length === 0) return null;

  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  const parseExpr = (): number => {
    let left = parseTerm();
    while (
      peek()?.type === 'op' &&
      (peek() as { type: 'op'; value: string }).value.match(/^[+-]$/)
    ) {
      const op = (consume() as { type: 'op'; value: '+' | '-' }).value;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  };

  const parseTerm = (): number => {
    let left = parseUnary();
    while (
      peek()?.type === 'op' &&
      (peek() as { type: 'op'; value: string }).value.match(/^[*/]$/)
    ) {
      const op = (consume() as { type: 'op'; value: '*' | '/' }).value;
      const right = parseUnary();
      if (op === '*') {
        left *= right;
      } else {
        if (right === 0) return NaN;
        left /= right;
      }
    }
    return left;
  };

  const parseUnary = (): number => {
    const tok = peek();
    if (tok?.type === 'op' && (tok.value === '+' || tok.value === '-')) {
      consume();
      const val = parseUnary();
      return tok.value === '-' ? -val : val;
    }
    return parsePrimary();
  };

  const parsePrimary = (): number => {
    const tok = consume();
    if (!tok) return NaN;
    if (tok.type === 'num') return tok.value;
    if (tok.type === 'paren' && tok.value === '(') {
      const val = parseExpr();
      const close = consume();
      if (!close || close.type !== 'paren' || close.value !== ')') return NaN;
      return val;
    }
    if (tok.type === 'ident') {
      const open = consume();
      if (!open || open.type !== 'paren' || open.value !== '(') return NaN;
      const args: number[] = [];
      if (peek()?.type !== 'paren') {
        args.push(parseExpr());
        while (peek()?.type === 'comma') {
          consume();
          args.push(parseExpr());
        }
      }
      const close = consume();
      if (!close || close.type !== 'paren' || close.value !== ')') return NaN;
      if (args.length === 0) return NaN;
      if (tok.value === 'round') return Math.round(args[0]);
      if (tok.value === 'min') return Math.min(...args);
      if (tok.value === 'max') return Math.max(...args);
      return NaN;
    }
    return NaN;
  };

  const result = parseExpr();
  if (pos !== tokens.length || !Number.isFinite(result)) return null;
  const clampedDecimals = Math.min(Math.max(Math.trunc(decimals ?? 2), 0), 6);
  const factor = 10 ** clampedDecimals;
  return Math.round(result * factor) / factor;
}
