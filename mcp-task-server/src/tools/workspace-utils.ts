import { WorkspaceDatabasePropertyDefinition } from '../workspace-agent.js';

export function okResult(payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export function errorResult(code: string, message: string) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ error: code, message }),
      },
    ],
    isError: true,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function normalizeDatabaseSchema(schema: unknown[]): WorkspaceDatabasePropertyDefinition[] {
  return schema
    .filter((value): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value))
    .map((property) => {
      const config = asRecord(property.config);
      return {
        id: typeof property.id === 'string' ? property.id : crypto.randomUUID(),
        name: typeof property.name === 'string' && property.name.trim().length > 0 ? property.name.trim() : 'Untitled',
        type: typeof property.type === 'string' ? property.type as WorkspaceDatabasePropertyDefinition['type'] : 'rich_text',
        options: Array.isArray(property.options)
          ? property.options.filter((value): value is string => typeof value === 'string')
          : [],
        config,
      };
    });
}
