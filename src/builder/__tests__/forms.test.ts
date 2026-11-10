import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  type FormFieldLike,
  isFieldVisible,
  splitSteps,
  visibleRequiredFields,
} from '../forms/logic';

describe('builder form logic (pure)', () => {
  describe('isFieldVisible', () => {
    it('returns true when field has no conditions', () => {
      const field: FormFieldLike = { name: 'email', type: 'email' };
      assert.equal(isFieldVisible(field, {}), true);
      assert.equal(isFieldVisible(field, { role: 'developer' }), true);
    });

    it('evaluates equals and not_equals operators', () => {
      const fieldEquals: FormFieldLike = {
        name: 'tech',
        type: 'text',
        conditions: [
          { field: 'role', operator: 'equals', value: 'developer' },
        ],
      };
      assert.equal(isFieldVisible(fieldEquals, { role: 'developer' }), true);
      assert.equal(isFieldVisible(fieldEquals, { role: 'designer' }), false);
      assert.equal(isFieldVisible(fieldEquals, {}), false);

      const fieldNotEquals: FormFieldLike = {
        name: 'other',
        type: 'text',
        conditions: [
          { field: 'role', operator: 'not_equals', value: 'manager' },
        ],
      };
      assert.equal(isFieldVisible(fieldNotEquals, { role: 'designer' }), true);
      assert.equal(isFieldVisible(fieldNotEquals, { role: 'manager' }), false);
    });

    it('evaluates contains operator', () => {
      const field: FormFieldLike = {
        name: 'details',
        type: 'text',
        conditions: [
          { field: 'interests', operator: 'contains', value: 'coding' },
        ],
      };
      assert.equal(
        isFieldVisible(field, { interests: 'I love coding and music' }),
        true
      );
      assert.equal(
        isFieldVisible(field, { interests: 'I love sports' }),
        false
      );
    });

    it('evaluates empty and not_empty operators', () => {
      const emptyField: FormFieldLike = {
        name: 'missingNotice',
        type: 'text',
        conditions: [{ field: 'promoCode', operator: 'empty' }],
      };
      assert.equal(isFieldVisible(emptyField, {}), true);
      assert.equal(isFieldVisible(emptyField, { promoCode: '' }), true);
      assert.equal(isFieldVisible(emptyField, { promoCode: 'SUMMER' }), false);

      const notEmptyField: FormFieldLike = {
        name: 'discount',
        type: 'text',
        conditions: [{ field: 'promoCode', operator: 'not_empty' }],
      };
      assert.equal(isFieldVisible(notEmptyField, {}), false);
      assert.equal(isFieldVisible(notEmptyField, { promoCode: '' }), false);
      assert.equal(isFieldVisible(notEmptyField, { promoCode: 'SUMMER' }), true);
    });

    it('handles conditionMatch all vs any', () => {
      const fieldAll: FormFieldLike = {
        name: 'seniorDevBonus',
        type: 'text',
        conditionMatch: 'all',
        conditions: [
          { field: 'role', operator: 'equals', value: 'dev' },
          { field: 'years', operator: 'equals', value: '5' },
        ],
      };
      assert.equal(
        isFieldVisible(fieldAll, { role: 'dev', years: '5' }),
        true
      );
      assert.equal(
        isFieldVisible(fieldAll, { role: 'dev', years: '2' }),
        false
      );

      const fieldAny: FormFieldLike = {
        name: 'contactOption',
        type: 'text',
        conditionMatch: 'any',
        conditions: [
          { field: 'pref', operator: 'equals', value: 'email' },
          { field: 'pref', operator: 'equals', value: 'phone' },
        ],
      };
      assert.equal(isFieldVisible(fieldAny, { pref: 'email' }), true);
      assert.equal(isFieldVisible(fieldAny, { pref: 'phone' }), true);
      assert.equal(isFieldVisible(fieldAny, { pref: 'mail' }), false);
    });
  });

  describe('splitSteps', () => {
    it('returns a single step for forms without step fields', () => {
      const fields: FormFieldLike[] = [
        { name: 'name', type: 'text' },
        { name: 'email', type: 'email' },
      ];
      const steps = splitSteps(fields);
      assert.equal(steps.length, 1);
      assert.equal(steps[0].title, 'Step 1');
      assert.deepEqual(steps[0].fields, fields);
    });

    it('splits fields into multiple steps using step dividers', () => {
      const fields: FormFieldLike[] = [
        { name: 'name', type: 'text' },
        { name: 'step1', type: 'step', label: 'Company Info' },
        { name: 'company', type: 'text' },
        { name: 'size', type: 'number' },
        { name: 'step2', type: 'step', label: 'Final Details' },
        { name: 'comments', type: 'textarea' },
      ];
      const steps = splitSteps(fields);
      assert.equal(steps.length, 3);
      assert.equal(steps[0].title, 'Step 1');
      assert.equal(steps[0].fields.length, 1);
      assert.equal(steps[0].fields[0].name, 'name');

      assert.equal(steps[1].title, 'Company Info');
      assert.equal(steps[1].fields.length, 2);
      assert.equal(steps[1].fields[0].name, 'company');
      assert.equal(steps[1].fields[1].name, 'size');

      assert.equal(steps[2].title, 'Final Details');
      assert.equal(steps[2].fields.length, 1);
      assert.equal(steps[2].fields[0].name, 'comments');
    });

    it('handles step field as first element', () => {
      const fields: FormFieldLike[] = [
        { name: 's1', type: 'step', label: 'Personal Information' },
        { name: 'name', type: 'text' },
      ];
      const steps = splitSteps(fields);
      assert.equal(steps.length, 1);
      assert.equal(steps[0].title, 'Personal Information');
      assert.equal(steps[0].fields.length, 1);
      assert.equal(steps[0].fields[0].name, 'name');
    });
  });

  describe('visibleRequiredFields', () => {
    it('returns only required visible fields and excludes step fields', () => {
      const fields: FormFieldLike[] = [
        { name: 's1', type: 'step', label: 'Step 1' },
        { name: 'name', type: 'text', required: true },
        { name: 'company', type: 'text', required: false },
        {
          name: 'taxId',
          type: 'text',
          required: true,
          conditions: [{ field: 'isBusiness', operator: 'equals', value: 'yes' }],
        },
        { name: 'terms', type: 'acceptance' },
      ];

      // When isBusiness is not yes
      const req1 = visibleRequiredFields(fields, {});
      assert.deepEqual(
        req1.map(f => f.name),
        ['name', 'terms']
      );

      // When isBusiness is yes
      const req2 = visibleRequiredFields(fields, { isBusiness: 'yes' });
      assert.deepEqual(
        req2.map(f => f.name),
        ['name', 'taxId', 'terms']
      );
    });
  });
});
