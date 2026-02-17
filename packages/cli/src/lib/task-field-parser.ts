import type { CustomFieldInput } from '@jogi47/pm-cli-core';

export function parseCustomFieldFlags(rawFlags: string[] | undefined): { fields: CustomFieldInput[]; error: string | null } {
  if (!rawFlags || rawFlags.length === 0) {
    return { fields: [], error: null };
  }

  const fields: CustomFieldInput[] = [];

  for (const raw of rawFlags) {
    const assignment = raw.trim();
    const separatorIndex = assignment.indexOf('=');

    if (separatorIndex === -1) {
      return { fields: [], error: `Invalid --field value "${raw}". Expected format: <Field>=<Value>.` };
    }

    const field = assignment.slice(0, separatorIndex).trim();
    const valuePart = assignment.slice(separatorIndex + 1);

    if (!field) {
      return { fields: [], error: `Invalid --field value "${raw}". Field name or ID cannot be empty.` };
    }

    if (valuePart.length === 0) {
      fields.push({ field, values: [] });
      continue;
    }

    const values = valuePart.split(',').map((value) => value.trim());
    if (values.some((value) => value.length === 0)) {
      return {
        fields: [],
        error: `Invalid --field value "${raw}". Use comma-separated values with no empty entries.`,
      };
    }

    fields.push({ field, values });
  }

  return { fields, error: null };
}

export function mergeLegacyDifficultyField(
  fields: CustomFieldInput[],
  difficulty: string | undefined
): CustomFieldInput[] {
  if (!difficulty) return fields;
  return [{ field: 'Difficulty', values: [difficulty] }, ...fields];
}
