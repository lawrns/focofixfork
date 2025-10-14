export type FilterOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in' | 'is_empty' | 'is_not_empty'

export type SortDirection = 'asc' | 'desc'

export interface FilterCondition {
  field: string
  operator: FilterOperator
  value: any
  caseSensitive?: boolean
}

export interface SortCondition {
  field: string
  direction: SortDirection
}

export interface FilterGroup {
  id: string
  name: string
  conditions: FilterCondition[]
  sortConditions: SortCondition[]
  isDefault?: boolean
  createdAt: string
  updatedAt: string
}

export interface FilterResult<T> {
  items: T[]
  totalCount: number
  filteredCount: number
  appliedFilters: FilterCondition[]
  appliedSort: SortCondition[]
}

/**
 * Advanced filtering and sorting service
 */
export class FilteringService {
  /**
   * Apply filters and sorting to a dataset
   */
  static filterAndSort<T>(
    items: T[],
    filters: FilterCondition[] = [],
    sortConditions: SortCondition[] = []
  ): FilterResult<T> {
    // Ensure items is always an array
    const safeItems = Array.isArray(items) ? items : []
    let filteredItems = [...safeItems]

    // Apply filters
    filteredItems = this.applyFilters(filteredItems, filters)

    // Apply sorting
    filteredItems = this.applySorting(filteredItems, sortConditions)

    return {
      items: filteredItems,
      totalCount: safeItems.length,
      filteredCount: filteredItems.length,
      appliedFilters: filters,
      appliedSort: sortConditions
    }
  }

  /**
   * Apply filter conditions to items
   */
  private static applyFilters<T>(items: T[], conditions: FilterCondition[]): T[] {
    if (conditions.length === 0) return items

    return items.filter(item => {
      return conditions.every(condition => {
        return this.evaluateCondition(item, condition)
      })
    })
  }

  /**
   * Evaluate a single filter condition
   */
  private static evaluateCondition<T>(item: T, condition: FilterCondition): boolean {
    const { field, operator, value, caseSensitive = false } = condition
    const itemValue = this.getNestedValue(item, field)

    switch (operator) {
      case 'equals':
        return this.equals(itemValue, value, caseSensitive)

      case 'not_equals':
        return !this.equals(itemValue, value, caseSensitive)

      case 'contains':
        return this.contains(itemValue, value, caseSensitive)

      case 'not_contains':
        return !this.contains(itemValue, value, caseSensitive)

      case 'starts_with':
        return this.startsWith(itemValue, value, caseSensitive)

      case 'ends_with':
        return this.endsWith(itemValue, value, caseSensitive)

      case 'greater_than':
        return this.greaterThan(itemValue, value)

      case 'less_than':
        return this.lessThan(itemValue, value)

      case 'between':
        return this.between(itemValue, value)

      case 'in':
        return this.in(itemValue, value)

      case 'not_in':
        return !this.in(itemValue, value)

      case 'is_empty':
        return this.isEmpty(itemValue)

      case 'is_not_empty':
        return !this.isEmpty(itemValue)

      default:
        return true
    }
  }

  /**
   * Apply sorting conditions
   */
  private static applySorting<T>(items: T[], sortConditions: SortCondition[]): T[] {
    if (sortConditions.length === 0) return items

    return [...items].sort((a, b) => {
      for (const condition of sortConditions) {
        const aValue = this.getNestedValue(a, condition.field)
        const bValue = this.getNestedValue(b, condition.field)

        let comparison = 0

        if (aValue == null && bValue == null) {
          comparison = 0
        } else if (aValue == null) {
          comparison = condition.direction === 'asc' ? -1 : 1
        } else if (bValue == null) {
          comparison = condition.direction === 'asc' ? 1 : -1
        } else {
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue.localeCompare(bValue)
          } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue
          } else if (aValue instanceof Date && bValue instanceof Date) {
            comparison = aValue.getTime() - bValue.getTime()
          } else {
            // Convert to string for comparison
            comparison = String(aValue).localeCompare(String(bValue))
          }
        }

        if (comparison !== 0) {
          return condition.direction === 'asc' ? comparison : -comparison
        }
      }

      return 0
    })
  }

  /**
   * Get nested object value by path
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  // Filter evaluation methods
  private static equals(a: any, b: any, caseSensitive: boolean = false): boolean {
    if (a == null || b == null) return a === b

    if (typeof a === 'string' && typeof b === 'string' && !caseSensitive) {
      return a.toLowerCase() === b.toLowerCase()
    }

    return a === b
  }

  private static contains(a: any, b: any, caseSensitive: boolean = false): boolean {
    if (a == null || b == null) return false

    const aStr = String(a)
    const bStr = String(b)

    if (!caseSensitive) {
      return aStr.toLowerCase().includes(bStr.toLowerCase())
    }

    return aStr.includes(bStr)
  }

  private static startsWith(a: any, b: any, caseSensitive: boolean = false): boolean {
    if (a == null || b == null) return false

    const aStr = String(a)
    const bStr = String(b)

    if (!caseSensitive) {
      return aStr.toLowerCase().startsWith(bStr.toLowerCase())
    }

    return aStr.startsWith(bStr)
  }

  private static endsWith(a: any, b: any, caseSensitive: boolean = false): boolean {
    if (a == null || b == null) return false

    const aStr = String(a)
    const bStr = String(b)

    if (!caseSensitive) {
      return aStr.toLowerCase().endsWith(bStr.toLowerCase())
    }

    return aStr.endsWith(bStr)
  }

  private static greaterThan(a: any, b: any): boolean {
    if (a == null || b == null) return false

    if (a instanceof Date && b instanceof Date) {
      return a.getTime() > b.getTime()
    }

    const aNum = Number(a)
    const bNum = Number(b)

    if (isNaN(aNum) || isNaN(bNum)) return false

    return aNum > bNum
  }

  private static lessThan(a: any, b: any): boolean {
    if (a == null || b == null) return false

    if (a instanceof Date && b instanceof Date) {
      return a.getTime() < b.getTime()
    }

    const aNum = Number(a)
    const bNum = Number(b)

    if (isNaN(aNum) || isNaN(bNum)) return false

    return aNum < bNum
  }

  private static between(a: any, range: [any, any]): boolean {
    if (a == null || !Array.isArray(range) || range.length !== 2) return false

    return this.greaterThan(a, range[0]) && this.lessThan(a, range[1])
  }

  private static in(a: any, values: any[]): boolean {
    if (a == null || !Array.isArray(values)) return false

    return values.some(value => this.equals(a, value))
  }

  private static isEmpty(a: any): boolean {
    if (a == null) return true

    if (typeof a === 'string') return a.trim().length === 0
    if (Array.isArray(a)) return a.length === 0

    return false
  }

  /**
   * Create a filter group from current filters and sorting
   */
  static createFilterGroup(
    name: string,
    filters: FilterCondition[],
    sortConditions: SortCondition[],
    isDefault: boolean = false
  ): FilterGroup {
    return {
      id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      conditions: filters,
      sortConditions,
      isDefault,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  /**
   * Get available filter operators for a field type
   */
  static getOperatorsForField(fieldType: 'string' | 'number' | 'date' | 'boolean' | 'array'): FilterOperator[] {
    const commonOperators: FilterOperator[] = ['equals', 'not_equals', 'is_empty', 'is_not_empty']

    switch (fieldType) {
      case 'string':
        return [...commonOperators, 'contains', 'not_contains', 'starts_with', 'ends_with']

      case 'number':
      case 'date':
        return [...commonOperators, 'greater_than', 'less_than', 'between']

      case 'boolean':
        return ['equals', 'not_equals']

      case 'array':
        return ['in', 'not_in', 'is_empty', 'is_not_empty']

      default:
        return commonOperators
    }
  }

  /**
   * Validate filter conditions
   */
  static validateConditions(conditions: FilterCondition[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    conditions.forEach((condition, index) => {
      if (!condition.field?.trim()) {
        errors.push(`Condition ${index + 1}: Field is required`)
      }

      if (!condition.operator) {
        errors.push(`Condition ${index + 1}: Operator is required`)
      }

      // Validate value based on operator
      if (['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'greater_than', 'less_than'].includes(condition.operator)) {
        if (condition.value == null || condition.value === '') {
          errors.push(`Condition ${index + 1}: Value is required for ${condition.operator}`)
        }
      }

      if (condition.operator === 'between') {
        if (!Array.isArray(condition.value) || condition.value.length !== 2) {
          errors.push(`Condition ${index + 1}: Between operator requires an array of two values`)
        }
      }

      if (['in', 'not_in'].includes(condition.operator)) {
        if (!Array.isArray(condition.value) || condition.value.length === 0) {
          errors.push(`Condition ${index + 1}: ${condition.operator} operator requires an array of values`)
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get field type from sample data
   */
  static inferFieldType(sampleValue: any): 'string' | 'number' | 'date' | 'boolean' | 'array' {
    if (sampleValue == null) return 'string'

    if (typeof sampleValue === 'boolean') return 'boolean'
    if (typeof sampleValue === 'number') return 'number'
    if (sampleValue instanceof Date) return 'date'
    if (Array.isArray(sampleValue)) return 'array'

    // Check if it's a date string
    if (typeof sampleValue === 'string' && !isNaN(Date.parse(sampleValue))) {
      return 'date'
    }

    // Check if it's a number string
    if (typeof sampleValue === 'string' && !isNaN(Number(sampleValue))) {
      return 'number'
    }

    return 'string'
  }
}


