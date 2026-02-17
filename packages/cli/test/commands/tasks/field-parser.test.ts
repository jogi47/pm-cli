import { describe, expect, it } from 'vitest';
import { mergeLegacyDifficultyField, parseCustomFieldFlags } from '../../../src/lib/task-field-parser.js';

describe('tasks field parser', () => {
  it('parses repeated enum and multi-enum fields', () => {
    const parsed = parseCustomFieldFlags(['Difficulty=XS', 'Other=Bugs,Analytics']);
    expect(parsed.error).toBeNull();
    expect(parsed.fields).toEqual([
      { field: 'Difficulty', values: ['XS'] },
      { field: 'Other', values: ['Bugs', 'Analytics'] },
    ]);
  });

  it('parses clear operation with empty value', () => {
    const parsed = parseCustomFieldFlags(['Difficulty=']);
    expect(parsed.error).toBeNull();
    expect(parsed.fields).toEqual([{ field: 'Difficulty', values: [] }]);
  });

  it('rejects malformed assignments', () => {
    const parsed = parseCustomFieldFlags(['Difficulty']);
    expect(parsed.error).toContain('Invalid --field value');
  });

  it('merges legacy difficulty as Difficulty field', () => {
    expect(mergeLegacyDifficultyField([{ field: 'Department', values: ['Frontend'] }], 'S')).toEqual([
      { field: 'Difficulty', values: ['S'] },
      { field: 'Department', values: ['Frontend'] },
    ]);
  });
});
