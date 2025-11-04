import { z } from 'zod'
import { randomUUID } from 'crypto'

/**
 * Pagination contract for all FOCO list endpoints v1.0.0
 * Matches the JSON Schema in schemas/pagination.v1.json
 */

// Sort direction enum
export const SortDirectionEnum = z.enum(['asc', 'desc'])
export type SortDirection = z.infer<typeof SortDirectionEnum>

// Pagination metadata schema
export const PaginationMetadataSchema = z.object({
  total_items: z.number().min(0).max(1000000),
  total_pages: z.number().min(0).max(10000),
  current_page: z.number().min(1).max(10000),
  page_size: z.number().min(1).max(100),
  has_next: z.boolean(),
  has_prev: z.boolean(),
  next_page: z.number().min(1).max(10000).nullable(),
  prev_page: z.number().min(1).max(10000).nullable(),
  first_page: z.literal(1),
  last_page: z.number().min(1).max(10000).nullable(),
  items_on_page: z.number().min(0).max(100),
  start_index: z.number().min(0).max(999999),
  end_index: z.number().min(-1).max(1000000),
  cursor: z.string().max(500).nullable(),
  has_more: z.boolean()
})

// Filter schemas
export const DateRangeFilterSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime()
})

export const FiltersSchema = z.object({
  search: z.string().max(500).nullable().optional(),
  status: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
  date_range: DateRangeFilterSchema.optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  custom_filters: z.object({}).passthrough().optional()
}).passthrough() // Allow additional custom filters

// Sort field schema
export const SortFieldSchema = z.object({
  field: z.string().max(100),
  direction: SortDirectionEnum
})

export const SortSchema = z.object({
  field: z.string().max(100).optional(),
  direction: SortDirectionEnum.optional(),
  multiple_sort: z.array(SortFieldSchema).max(5).optional()
})

// Response metadata schema
export const ResponseMetadataSchema = z.object({
  request_id: z.string().max(100).optional(),
  generated_at: z.string().datetime().optional(),
  processing_time_ms: z.number().min(0).max(30000).optional(),
  cache_hit: z.boolean().optional(),
  total_items_estimate: z.boolean().optional(),
  max_page_size_reached: z.boolean().optional(),
  truncated: z.boolean().optional(),
  rate_limit: z.object({
    limit: z.number().min(1).max(10000),
    remaining: z.number().min(0).max(10000),
    reset_time: z.string().datetime()
  }).optional()
}).passthrough()

// Main paginated response schema
export function createPaginatedResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    pagination: PaginationMetadataSchema,
    filters: FiltersSchema.optional(),
    sort: SortSchema.optional(),
    metadata: ResponseMetadataSchema.optional()
  })
}

// Type exports
export type PaginationMetadata = z.infer<typeof PaginationMetadataSchema>
export type Filters = z.infer<typeof FiltersSchema>
export type SortInfo = z.infer<typeof SortSchema>
export type ResponseMetadata = z.infer<typeof ResponseMetadataSchema>
export type PaginatedResponse<T> = z.infer<ReturnType<typeof createPaginatedResponseSchema<z.ZodType<T>>>>

/**
 * Pagination query parameters schema
 */
export const PaginationQuerySchema = z.object({
  // Offset-based pagination
  page: z.string().transform(Number).pipe(z.number().min(1).max(10000)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('20'),
  
  // Cursor-based pagination
  cursor: z.string().max(500).nullable().optional(),
  
  // Filtering
  search: z.string().max(500).nullable().optional(),
  status: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
  start_date: z.string().datetime().nullable().optional(),
  end_date: z.string().datetime().nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  
  // Sorting
  sort_by: z.string().max(100).default('created_at'),
  sort_direction: z.enum(['asc', 'desc']).default('desc'),
  
  // Multiple sort fields (comma-separated)
  sort: z.string().max(500).optional(),
  
  // Response options
  include_metadata: z.enum(['true', 'false']).transform(val => val === 'true').default('true'),
  include_filters: z.enum(['true', 'false']).transform(val => val === 'true').default('true'),
  include_sort: z.enum(['true', 'false']).transform(val => val === 'true').default('true')
})

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>

/**
 * Pagination result interface
 */
export interface PaginationResult<T> {
  items: T[]
  totalItems: number
  currentPage: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
  nextPage?: number
  prevPage?: number
  itemsOnPage: number
  startIndex: number
  endIndex: number
  cursor?: string
  hasMore: boolean
}

/**
 * Pagination builder class
 */
export class PaginationBuilder<T> {
  private items: T[] = []
  private totalItems: number = 0
  private currentPage: number = 1
  private pageSize: number = 20
  private hasNext: boolean = false
  private hasPrev: boolean = false
  private cursor?: string
  private hasMore: boolean = false
  private filters?: Filters
  private sort?: SortInfo
  private metadata?: ResponseMetadata

  constructor(query: PaginationQuery) {
    this.currentPage = query.page
    this.pageSize = query.limit
    this.cursor = query.cursor ?? undefined
  }

  setItems(items: T[], totalItems?: number): PaginationBuilder<T> {
    this.items = items
    this.totalItems = totalItems ?? items.length
    return this
  }

  setCursorPagination(cursor: string, hasMore: boolean): PaginationBuilder<T> {
    this.cursor = cursor
    this.hasMore = hasMore
    return this
  }

  setFilters(filters: Filters): PaginationBuilder<T> {
    this.filters = filters
    return this
  }

  setSort(sort: SortInfo): PaginationBuilder<T> {
    this.sort = sort
    return this
  }

  setMetadata(metadata: ResponseMetadata): PaginationBuilder<T> {
    this.metadata = metadata
    return this
  }

  build(): PaginationResult<T> {
    const totalPages = Math.ceil(this.totalItems / this.pageSize)
    const hasNext = this.currentPage < totalPages
    const hasPrev = this.currentPage > 1
    const startIndex = (this.currentPage - 1) * this.pageSize
    const endIndex = this.items.length > 0 ? startIndex + this.items.length - 1 : -1

    return {
      items: this.items,
      totalItems: this.totalItems,
      currentPage: this.currentPage,
      pageSize: this.pageSize,
      totalPages,
      hasNext,
      hasPrev,
      nextPage: hasNext ? this.currentPage + 1 : undefined,
      prevPage: hasPrev ? this.currentPage - 1 : undefined,
      itemsOnPage: this.items.length,
      startIndex,
      endIndex,
      cursor: this.cursor,
      hasMore: this.hasMore
    }
  }

  buildResponse(): PaginatedResponse<T> {
    const result = this.build()
    
    return {
      data: result.items,
      pagination: {
        total_items: result.totalItems,
        total_pages: result.totalPages,
        current_page: result.currentPage,
        page_size: result.pageSize,
        has_next: result.hasNext,
        has_prev: result.hasPrev,
        next_page: result.nextPage ?? null,
        prev_page: result.prevPage ?? null,
        first_page: 1,
        last_page: result.totalPages > 0 ? result.totalPages : null,
        items_on_page: result.itemsOnPage,
        start_index: result.startIndex,
        end_index: result.endIndex,
        cursor: result.cursor ?? null,
        has_more: result.hasMore
      },
      filters: this.filters,
      sort: this.sort,
      metadata: {
        request_id: randomUUID(),
        generated_at: new Date().toISOString(),
        processing_time_ms: this.metadata?.processing_time_ms,
        cache_hit: this.metadata?.cache_hit,
        total_items_estimate: this.metadata?.total_items_estimate,
        max_page_size_reached: this.metadata?.max_page_size_reached,
        truncated: this.metadata?.truncated,
        rate_limit: this.metadata?.rate_limit,
        ...this.metadata
      }
    }
  }
}

/**
 * Pagination utilities
 */
export class PaginationUtils {
  /**
   * Parse sort parameter into multiple sort fields
   */
  static parseSortParameter(sortParam?: string): z.infer<typeof SortFieldSchema>[] | undefined {
    if (!sortParam) return undefined

    return sortParam.split(',').map(sortPart => {
      const [field, direction] = sortPart.split(':')
      return {
        field: field?.trim() || 'created_at',
        direction: (direction?.trim() as 'asc' | 'desc') || 'desc'
      }
    }).slice(0, 5) // Limit to 5 sort fields
  }

  /**
   * Create pagination metadata from query and result
   */
  static createPaginationMetadata(
    query: PaginationQuery,
    totalItems: number,
    itemsOnPage: number
  ): PaginationMetadata {
    const totalPages = Math.ceil(totalItems / query.limit)
    const hasNext = query.page < totalPages
    const hasPrev = query.page > 1
    const startIndex = (query.page - 1) * query.limit
    const endIndex = itemsOnPage > 0 ? startIndex + itemsOnPage - 1 : -1

    return {
      total_items: totalItems,
      total_pages: totalPages,
      current_page: query.page,
      page_size: query.limit,
      has_next: hasNext,
      has_prev: hasPrev,
      next_page: hasNext ? query.page + 1 : null,
      prev_page: hasPrev ? query.page - 1 : null,
      first_page: 1,
      last_page: totalPages > 0 ? totalPages : null,
      items_on_page: itemsOnPage,
      start_index: startIndex,
      end_index: endIndex,
      cursor: query.cursor ?? null,
      has_more: false // For offset-based pagination
    }
  }

  /**
   * Create filters object from query parameters
   */
  static createFilters(query: PaginationQuery): Filters {
    const filters: Filters = {}

    if (query.search) filters.search = query.search
    if (query.status) filters.status = query.status
    if (query.priority) filters.priority = query.priority
    if (query.tags && query.tags.length > 0) filters.tags = query.tags

    if (query.start_date || query.end_date) {
      filters.date_range = {
        start: query.start_date || new Date(0).toISOString(),
        end: query.end_date || new Date().toISOString()
      }
    }

    return filters
  }

  /**
   * Create sort object from query parameters
   */
  static createSort(query: PaginationQuery): SortInfo {
    const multipleSort = this.parseSortParameter(query.sort)
    
    if (multipleSort && multipleSort.length > 0) {
      return { multiple_sort: multipleSort }
    }

    return {
      field: query.sort_by,
      direction: query.sort_direction
    }
  }

  /**
   * Validate pagination query parameters
   */
  static validateQuery(query: unknown): PaginationQuery {
    return PaginationQuerySchema.parse(query)
  }

  /**
   * Calculate offset for database queries
   */
  static calculateOffset(page: number, pageSize: number): number {
    return (page - 1) * pageSize
  }

  /**
   * Generate cursor for cursor-based pagination
   */
  static generateCursor(lastItem: any, sortField: string): string {
    const cursorData = {
      id: lastItem.id,
      value: lastItem[sortField],
      field: sortField
    }
    return Buffer.from(JSON.stringify(cursorData)).toString('base64')
  }

  /**
   * Parse cursor for cursor-based pagination
   */
  static parseCursor(cursor: string): any {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8')
      return JSON.parse(decoded)
    } catch (error) {
      throw new Error('Invalid cursor format')
    }
  }

  /**
   * Get default pagination options
   */
  static getDefaults(): {
    defaultPage: number
    defaultPageSize: number
    maxPageSize: number
    maxPage: number
  } {
    return {
      defaultPage: 1,
      defaultPageSize: 20,
      maxPageSize: 100,
      maxPage: 10000
    }
  }
}

/**
 * Express middleware for pagination query parsing
 */
export function paginationMiddleware() {
  return (req: any, res: any, next: any) => {
    try {
      req.pagination = PaginationUtils.validateQuery(req.query)
      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Higher-order function to create paginated responses
 */
export function createPaginatedResponse<T>(
  items: T[],
  totalItems: number,
  query: PaginationQuery,
  options?: {
    filters?: Filters
    sort?: SortInfo
    metadata?: Partial<ResponseMetadata>
  }
): PaginatedResponse<T> {
  const paginationMetadata = PaginationUtils.createPaginationMetadata(
    query,
    totalItems,
    items.length
  )

  const builder = new PaginationBuilder<T>(query)
    .setItems(items, totalItems)
    .setFilters(options?.filters || PaginationUtils.createFilters(query))
    .setSort(options?.sort || PaginationUtils.createSort(query))

  if (options?.metadata) {
    builder.setMetadata(options.metadata)
  }

  return builder.buildResponse()
}

// Export types are already exported through their type declarations
