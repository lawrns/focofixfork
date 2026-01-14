/**
 * UI Invariant Enforcement: Select Component Validation
 *
 * Radix UI Select components have strict invariants:
 * - SelectItem value MUST be a non-empty string
 * - SelectValue must be undefined (not '') for placeholder
 * - null/undefined/'' are distinct and must never be conflated
 *
 * This module provides pre-render validation to prevent runtime crashes.
 */

export interface SelectOption {
  id: string
  [key: string]: any
}

/**
 * Filter options to only those with valid, non-empty IDs.
 * Use this BEFORE mapping to SelectItem components.
 *
 * @example
 * const validOptions = filterValidSelectOptions(projects)
 * {validOptions.map(p => <SelectItem value={p.id}>{p.name}</SelectItem>)}
 */
export function filterValidSelectOptions<T extends SelectOption>(
  options: T[] | null | undefined
): T[] {
  if (!options || !Array.isArray(options)) return []
  return options.filter(opt =>
    opt &&
    typeof opt.id === 'string' &&
    opt.id.trim() !== ''
  )
}

/**
 * Convert a nullable value to a valid Select value.
 * Returns undefined (for placeholder) instead of empty string.
 *
 * @example
 * <Select value={toSelectValue(selectedId)}>
 */
export function toSelectValue(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined
  }
  return value
}

/**
 * Convert a nullable value to a Select value with a sentinel for "none".
 * Use when you need an explicit "none" option in the Select.
 *
 * @example
 * <Select value={toSelectValueWithNone(milestoneId, 'none')}>
 *   <SelectItem value="none">No milestone</SelectItem>
 *   ...
 * </Select>
 */
export function toSelectValueWithNone(
  value: string | null | undefined,
  noneValue: string = 'none'
): string {
  if (value === null || value === undefined || value === '') {
    return noneValue
  }
  return value
}

/**
 * Parse a Select value back to nullable form.
 * Use in onValueChange handlers.
 *
 * @example
 * onValueChange={(v) => setValue('milestone_id', fromSelectValue(v, 'none'))}
 */
export function fromSelectValue(
  value: string,
  noneValue: string = 'none'
): string | null {
  if (value === noneValue) {
    return null
  }
  return value
}

/**
 * Runtime invariant check - logs violations in development.
 * Use for debugging when Select crashes occur.
 */
export function assertValidSelectValue(
  value: unknown,
  componentName: string
): asserts value is string | undefined {
  if (value === '') {
    console.error(
      `[UI Invariant Violation] ${componentName}: Select received empty string value. ` +
      `Use undefined for placeholder, or a non-empty string for selected value.`
    )
  }
  if (value !== undefined && typeof value !== 'string') {
    console.error(
      `[UI Invariant Violation] ${componentName}: Select received non-string value: ${typeof value}. ` +
      `Value must be string or undefined.`
    )
  }
}

/**
 * Validate an array of options before rendering.
 * Logs warnings for any invalid options that would crash Radix.
 */
export function validateSelectOptions<T extends { id?: string | null }>(
  options: T[] | null | undefined,
  componentName: string
): { valid: T[], invalid: T[] } {
  if (!options || !Array.isArray(options)) {
    return { valid: [], invalid: [] }
  }

  const valid: T[] = []
  const invalid: T[] = []

  for (const opt of options) {
    if (opt && typeof opt.id === 'string' && opt.id.trim() !== '') {
      valid.push(opt)
    } else {
      invalid.push(opt)
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[UI Invariant Warning] ${componentName}: Option with invalid id skipped:`,
          { id: opt?.id, option: opt }
        )
      }
    }
  }

  return { valid, invalid }
}
