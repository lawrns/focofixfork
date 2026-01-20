'use client'

import { BaseEmptyState } from './base-empty-state'
import Image from 'next/image'
import { Search, Filter } from 'lucide-react'

type SearchEmptyVariant = 'no-query' | 'no-results'

interface SearchEmptyProps {
  variant: SearchEmptyVariant
  query?: string
  onClearFilters?: () => void
  onNewSearch?: () => void
}

export function SearchEmpty({ variant, query, onClearFilters, onNewSearch }: SearchEmptyProps) {
  if (variant === 'no-query') {
    return (
      <BaseEmptyState
        icon={<Search className="w-16 h-16" />}
        title="Start searching"
        description="Search across tasks, projects, people, and more. Try searching for a task name, project, or keyword."
        className="py-24"
      >
        {/* Search examples */}
        <div className="mt-8 max-w-md mx-auto">
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Example searches</h4>
          <div className="flex flex-wrap gap-2 justify-center">
            {['Design review', 'Marketing tasks', '@john', '#urgent'].map((example) => (
              <button
                key={example}
                onClick={() => onNewSearch?.()}
                className="px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </BaseEmptyState>
    )
  }

  // no-results variant
  const illustration = (
    <div className="relative w-full h-full">
      <Image
        src="/images/empty-states/search-no-results.png"
        alt="No search results"
        width={192}
        height={192}
        className="mx-auto dark:opacity-90"
        priority
      />
    </div>
  )

  return (
    <BaseEmptyState
      title="No results found"
      description={query ? `No results for "${query}". Try adjusting your search terms or clearing filters.` : 'No results found. Try adjusting your search terms or clearing filters.'}
      illustration={illustration}
      primaryAction={onClearFilters ? {
        label: 'Clear Filters',
        onClick: onClearFilters,
        variant: 'outline'
      } : undefined}
      secondaryAction={onNewSearch ? {
        label: 'New Search',
        onClick: onNewSearch
      } : undefined}
    >
      {/* Search tips */}
      <div className="mt-8 max-w-md mx-auto text-sm text-zinc-600 dark:text-zinc-400">
        <h4 className="font-medium text-zinc-700 dark:text-zinc-300 mb-2">Search tips</h4>
        <ul className="space-y-1 text-left">
          <li className="flex items-start gap-2">
            <span className="text-primary-500">•</span>
            <span>Use @ to search for people (e.g., @john)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-500">•</span>
            <span>Use # to search for tags (e.g., #urgent)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-500">•</span>
            <span>Try broader terms or check spelling</span>
          </li>
        </ul>
      </div>
    </BaseEmptyState>
  )
}
