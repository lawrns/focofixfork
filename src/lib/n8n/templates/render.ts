import type { N8nWorkflowTemplate } from './types'

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue }

function resolveString(input: string, params: Record<string, unknown>): string {
  if (input.startsWith('env:')) {
    const key = input.slice(4).trim()
    return process.env[key] ?? ''
  }

  return input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = params[key]
    if (value === null || value === undefined) return ''
    return String(value)
  })
}

function deepResolve(value: unknown, params: Record<string, unknown>): JsonValue {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'string') return resolveString(value, params)
  if (Array.isArray(value)) return value.map((v) => deepResolve(v, params))
  if (typeof value === 'object') {
    const out: { [k: string]: JsonValue } = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepResolve(v, params)
    }
    return out
  }
  return String(value)
}

export function instantiateTemplateWorkflow(
  template: N8nWorkflowTemplate,
  inputParams?: Record<string, unknown>
) {
  const params = {
    ...template.parameters,
    ...(inputParams ?? {}),
  }

  const rendered = deepResolve(template.workflow, params) as N8nWorkflowTemplate['workflow']
  return {
    workflow: rendered,
    params,
  }
}
